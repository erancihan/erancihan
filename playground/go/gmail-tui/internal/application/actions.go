package application

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"sync"

	tea "github.com/charmbracelet/bubbletea"
	"google.golang.org/api/gmail/v1"
)

const batchModifyLimit = 1000 // ids per messages.batchModify request

// systemLabels are the built-in labels offered in the label picker, in order.
var systemLabels = []label{{"INBOX", "Inbox"}, {"STARRED", "Starred"}, {"IMPORTANT", "Important"}}

type label struct {
	ID, Name string
}

// --- MESSAGES ---
type labelsLoadedMsg struct {
	labels []label
	err    error
}

// actionDoneMsg reports a finished modify or trash request.
type actionDoneMsg struct {
	ids     []string // mails the action succeeded on
	add     []string
	remove  []string
	trash   bool
	created *label // label created by this action, if any
	verb    string // past tense for the status line, e.g. "Marked read"
	failed  int
	err     error
}

// --- SELECTION ---

// targets returns the mails an action applies to: the selection if any,
// else the mail under the cursor, else the sender group under the cursor.
func (m model) targets() []email {
	if len(m.selected) > 0 {
		var out []email
		for _, e := range m.data.emails {
			if m.selected[e.ID] {
				out = append(out, e)
			}
		}
		return out
	}
	if e, ok := m.selectedEmail(); ok {
		return []email{e}
	}
	if g, ok := m.selectedGroup(); ok {
		return g.emails
	}
	return nil
}

// toggleSelect selects or clears the mail under the cursor; on a sender header
// it does so for the whole group.
func (m *model) toggleSelect() {
	var es []email
	if e, ok := m.selectedEmail(); ok {
		es = []email{e}
	} else if g, ok := m.selectedGroup(); ok {
		es = g.emails
	}
	all := len(es) > 0
	for _, e := range es {
		all = all && m.selected[e.ID]
	}
	for _, e := range es {
		if all {
			delete(m.selected, e.ID)
		} else {
			m.selected[e.ID] = true
		}
	}
}

// toggleSelectAll selects every mail of the day, or clears the selection if all are selected.
func (m *model) toggleSelectAll() {
	if len(m.selected) == len(m.data.emails) {
		clear(m.selected)
		return
	}
	for _, e := range m.data.emails {
		m.selected[e.ID] = true
	}
}

func ids(es []email) []string {
	out := make([]string, len(es))
	for i, e := range es {
		out[i] = e.ID
	}
	return out
}

func plural(n int) string {
	if n == 1 {
		return "1 mail"
	}
	return fmt.Sprintf("%d mails", n)
}

// --- ACTIONS ---

// toggleRead marks the targets read, or unread when they are all read already.
func (m model) toggleRead(es []email) tea.Cmd {
	if len(es) == 0 {
		return nil
	}
	if slices.ContainsFunc(es, func(e email) bool { return e.Unread }) {
		return modifyCmd(m.service, ids(es), nil, []string{"UNREAD"}, "Marked read:")
	}
	return modifyCmd(m.service, ids(es), []string{"UNREAD"}, nil, "Marked unread:")
}

func (m model) confirmTrash(es []email) model {
	if len(es) == 0 {
		return m
	}
	m.modal = modalConfirm
	m.confirm = confirmState{text: "Move " + plural(len(es)) + " to Trash?", ids: ids(es)}
	return m
}

func (m model) openLabels(es []email) (model, tea.Cmd) {
	if len(es) == 0 {
		return m, nil
	}
	m.modal = modalLabels
	m.picker = labelPicker{ids: ids(es)}
	if m.labels == nil {
		return m, fetchLabels(m.service)
	}
	return m, nil
}

// actionDone applies a finished action to every cached copy of the mails.
func (m model) actionDone(msg actionDoneMsg) (tea.Model, tea.Cmd) {
	if msg.created != nil {
		m.labels = append(m.labels, *msg.created)
		sortLabels(m.labels)
	}
	if len(msg.ids) > 0 {
		set := map[string]bool{}
		for _, id := range msg.ids {
			set[id] = true
		}
		m.mutate(set, msg.trash, func(e *email) {
			e.Labels = withLabels(e.Labels, msg.add, msg.remove)
			e.Unread = slices.Contains(e.Labels, "UNREAD")
		})
		if msg.verb != "" { // user action: the selection has been used up
			clear(m.selected)
		}
	}
	switch {
	case msg.err != nil:
		m.status = errorStyle.Render("Error: " + msg.err.Error())
	case msg.verb == "": // background action, e.g. mark read on open
	case msg.failed > 0:
		m.status = errorStyle.Render(fmt.Sprintf("%s %s, %d failed", msg.verb, plural(len(msg.ids)), msg.failed))
	default:
		m.status = msg.verb + " " + plural(len(msg.ids))
	}
	return m, nil
}

// mutate updates the given mails in every cached day; trashed mails, and mails
// that left the inbox for inbox-scoped days, are dropped.
func (m *model) mutate(set map[string]bool, trash bool, fn func(*email)) {
	cur, hasCur := m.selectedEmail()
	for k, d := range m.cache {
		changed := false
		var kept []email
		for _, e := range d.emails {
			if set[e.ID] {
				changed = true
				if trash {
					continue
				}
				fn(&e)
				if k.scope == scopeInbox && !slices.Contains(e.Labels, "INBOX") {
					continue
				}
			}
			kept = append(kept, e)
		}
		if changed {
			m.cache[k] = newDayData(kept, d.failed)
		}
	}
	clear(m.statsCache) // counts are stale now

	if d, ok := m.cache[m.key()]; ok {
		m.data = d
		m.rebuild()
		if hasCur {
			m.cursorTo(cur.ID)
		}
	}
	if m.mode == modeReader {
		if trash && set[m.reader.email.ID] {
			m.mode = modeDay
			return
		}
		if set[m.reader.email.ID] {
			fn(&m.reader.email)
		}
	}
}

// withLabels returns a new slice with `add` added and `remove` removed.
func withLabels(labels, add, remove []string) []string {
	out := make([]string, 0, len(labels)+len(add))
	for _, l := range labels {
		if !slices.Contains(remove, l) && !slices.Contains(add, l) {
			out = append(out, l)
		}
	}
	return append(out, add...)
}

// --- MODALS ---
type modal int

const (
	modalNone modal = iota
	modalSettings
	modalLabels
	modalConfirm
	modalHelp
)

type confirmState struct {
	text string
	ids  []string
}

type labelPicker struct {
	ids    []string // mails the picker applies to
	filter string
	cursor int
}

// pickItem is a label picker row; create rows make a new label named `filter`.
type pickItem struct {
	label  label
	create bool
}

func (m model) pickItems() []pickItem {
	var items []pickItem
	f := strings.ToLower(m.picker.filter)
	exact := false
	for _, l := range m.labels {
		name := strings.ToLower(l.Name)
		if strings.Contains(name, f) {
			items = append(items, pickItem{label: l})
		}
		exact = exact || name == f
	}
	if f != "" && !exact {
		items = append(items, pickItem{label: label{Name: m.picker.filter}, create: true})
	}
	return items
}

// labelCount returns how many of the picker's mails carry label id.
func (m model) labelCount(id string) int {
	set := map[string]bool{}
	for _, pid := range m.picker.ids {
		set[pid] = true
	}
	n := 0
	for _, e := range m.data.emails {
		if set[e.ID] && slices.Contains(e.Labels, id) {
			n++
		}
	}
	if m.mode == modeReader && set[m.reader.email.ID] && !slices.ContainsFunc(m.data.emails, func(e email) bool { return e.ID == m.reader.email.ID }) {
		if slices.Contains(m.reader.email.Labels, id) {
			n++
		}
	}
	return n
}

func (m model) updateModal(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	k := msg.String()
	switch m.modal {
	case modalHelp:
		m.modal = modalNone

	case modalConfirm:
		switch k {
		case "y", "enter":
			m.modal = modalNone
			m.status = "Moving to Trash…"
			return m, trashCmd(m.service, m.confirm.ids)
		case "n", "esc", "q":
			m.modal = modalNone
		}

	case modalSettings:
		switch k {
		case "j", "down":
			m.settingsCursor = min(m.settingsCursor+1, len(settingItems)-1)
		case "k", "up":
			m.settingsCursor = max(m.settingsCursor-1, 0)
		case " ", "enter":
			cur, hasCur := m.selectedEmail()
			v := settingItems[m.settingsCursor].field(&m.settings)
			*v = !*v
			if err := m.settings.save(m.settingsPath); err != nil {
				m.status = errorStyle.Render("Could not save settings: " + err.Error())
			}
			m.rebuild()
			if hasCur {
				m.cursorTo(cur.ID)
			}
		case "esc", "q", ",":
			m.modal = modalNone
		}

	case modalLabels:
		items := m.pickItems()
		switch k {
		case "esc":
			m.modal = modalNone
		case "up", "ctrl+p":
			m.picker.cursor = max(m.picker.cursor-1, 0)
		case "down", "ctrl+n":
			m.picker.cursor = min(m.picker.cursor+1, len(items)-1)
		case "backspace":
			if r := []rune(m.picker.filter); len(r) > 0 {
				m.picker.filter = string(r[:len(r)-1])
				m.picker.cursor = 0
			}
		case "enter":
			if m.picker.cursor >= len(items) {
				return m, nil
			}
			it := items[m.picker.cursor]
			m.modal = modalNone
			if it.create {
				return m, createLabelCmd(m.service, it.label.Name, m.picker.ids)
			}
			if m.labelCount(it.label.ID) == len(m.picker.ids) {
				return m, modifyCmd(m.service, m.picker.ids, nil, []string{it.label.ID}, "Removed "+it.label.Name+" from")
			}
			return m, modifyCmd(m.service, m.picker.ids, []string{it.label.ID}, nil, "Labelled "+it.label.Name+":")
		default:
			if msg.Type == tea.KeyRunes || msg.Type == tea.KeySpace {
				m.picker.filter += string(msg.Runes)
				m.picker.cursor = 0
			}
		}
	}
	return m, nil
}

// --- MODAL VIEWS ---
func (m model) viewModal() string {
	var lines []string
	switch m.modal {
	case modalHelp:
		lines = append([]string{titleStyle.Render("Keys")}, helpLines...)
		lines = append(lines, "", dimStyle.Render("any key to close"))

	case modalConfirm:
		lines = []string{titleStyle.Render(m.confirm.text), "", dimStyle.Render("y confirm · n cancel")}

	case modalSettings:
		lines = []string{titleStyle.Render("Settings"), ""}
		for i, it := range settingItems {
			box := "[ ]"
			if *it.field(&m.settings) {
				box = "[x]"
			}
			line := box + " " + it.name
			if i == m.settingsCursor {
				line = selectedStyle.Render(line)
			}
			lines = append(lines, line)
		}
		lines = append(lines, "", dimStyle.Render("space toggle · esc close"))

	case modalLabels:
		lines = []string{titleStyle.Render("Label " + plural(len(m.picker.ids))), "> " + m.picker.filter + "▏", ""}
		switch {
		case m.labelsErr != nil:
			lines = append(lines, errorStyle.Render("Error: "+m.labelsErr.Error()))
		case m.labels == nil:
			lines = append(lines, "Loading labels…")
		}
		items := m.pickItems()
		const shown = 10
		start := max(0, min(m.picker.cursor-shown/2, len(items)-shown))
		for i := start; i < min(start+shown, len(items)); i++ {
			it := items[i]
			var line string
			if it.create {
				line = "+ Create “" + it.label.Name + "”"
			} else {
				box := "[ ]"
				switch n := m.labelCount(it.label.ID); {
				case n == len(m.picker.ids):
					box = "[x]"
				case n > 0:
					box = "[-]"
				}
				line = box + " " + it.label.Name
			}
			if i == m.picker.cursor {
				line = selectedStyle.Render(line)
			}
			lines = append(lines, line)
		}
		lines = append(lines, "", dimStyle.Render("type to filter · enter add/remove · esc close"))
	}
	return modalStyle.Render(strings.Join(lines, "\n"))
}

var helpLines = []string{
	"h/l ←/→   previous / next day      t  today",
	"j/k ↑/↓   move                     g/G  top / bottom",
	"enter     read mail                tab  all received / inbox",
	"x         select (header: group)   A  select all / none",
	"esc       clear selection",
	"d         move to Trash            m  mark read / unread",
	"L         add / remove label       u  unsubscribe",
	"o         open in Gmail            s  sender stats",
	"space/z   fold sender / all (grouped view)",
	",         settings                 r  reload day",
	"q         quit (back in reader and stats)",
}

// --- COMMANDS ---
func fetchLabels(srv *gmail.Service) tea.Cmd {
	return func() tea.Msg {
		r, err := srv.Users.Labels.List("me").Do()
		if err != nil {
			return labelsLoadedMsg{err: err}
		}
		labels := slices.Clone(systemLabels)
		for _, l := range r.Labels {
			if l.Type == "user" {
				labels = append(labels, label{ID: l.Id, Name: l.Name})
			}
		}
		sortLabels(labels)
		return labelsLoadedMsg{labels: labels}
	}
}

// sortLabels keeps system labels first, then user labels by name.
func sortLabels(labels []label) {
	rank := func(l label) int {
		if i := slices.IndexFunc(systemLabels, func(s label) bool { return s.ID == l.ID }); i >= 0 {
			return i
		}
		return len(systemLabels)
	}
	slices.SortStableFunc(labels, func(a, b label) int {
		if ra, rb := rank(a), rank(b); ra != rb {
			return ra - rb
		}
		return strings.Compare(strings.ToLower(a.Name), strings.ToLower(b.Name))
	})
}

func modifyCmd(srv *gmail.Service, msgIDs, add, remove []string, verb string) tea.Cmd {
	return func() tea.Msg {
		return batchModify(srv, msgIDs, add, remove, verb)
	}
}

func batchModify(srv *gmail.Service, msgIDs, add, remove []string, verb string) actionDoneMsg {
	done := actionDoneMsg{add: add, remove: remove, verb: verb}
	for chunk := range slices.Chunk(msgIDs, batchModifyLimit) {
		_, err := withRetry(func() (struct{}, error) {
			return struct{}{}, srv.Users.Messages.BatchModify("me", &gmail.BatchModifyMessagesRequest{
				Ids: chunk, AddLabelIds: add, RemoveLabelIds: remove,
			}).Do()
		})
		if err != nil {
			done.err = err
			done.failed = len(msgIDs) - len(done.ids)
			return done
		}
		done.ids = append(done.ids, chunk...)
	}
	return done
}

func createLabelCmd(srv *gmail.Service, name string, msgIDs []string) tea.Cmd {
	return func() tea.Msg {
		l, err := srv.Users.Labels.Create("me", &gmail.Label{
			Name: name, LabelListVisibility: "labelShow", MessageListVisibility: "show",
		}).Do()
		if err != nil {
			return actionDoneMsg{err: err}
		}
		created := label{ID: l.Id, Name: l.Name}
		done := batchModify(srv, msgIDs, []string{l.Id}, nil, "Labelled "+l.Name+":")
		done.created = &created
		return done
	}
}

// trashCmd moves mails to Trash; there is no batch endpoint for this.
func trashCmd(srv *gmail.Service, msgIDs []string) tea.Cmd {
	return func() tea.Msg {
		ctx := context.Background()
		ok := make([]bool, len(msgIDs))
		var firstErr error
		var mu sync.Mutex
		jobs := make(chan int)
		var wg sync.WaitGroup
		for range fetchWorkers {
			wg.Go(func() {
				for i := range jobs {
					_, err := withRetry(func() (*gmail.Message, error) {
						return srv.Users.Messages.Trash("me", msgIDs[i]).Context(ctx).Do()
					})
					if err != nil {
						mu.Lock()
						if firstErr == nil {
							firstErr = err
						}
						mu.Unlock()
						continue
					}
					ok[i] = true
				}
			})
		}
		for i := range msgIDs {
			jobs <- i
		}
		close(jobs)
		wg.Wait()

		done := actionDoneMsg{trash: true, verb: "Moved to Trash:"}
		for i, id := range msgIDs {
			if ok[i] {
				done.ids = append(done.ids, id)
			}
		}
		done.failed = len(msgIDs) - len(done.ids)
		if len(done.ids) == 0 {
			done.err = firstErr
		}
		return done
	}
}
