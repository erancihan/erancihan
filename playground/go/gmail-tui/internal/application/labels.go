package application

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"sync"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/x/ansi"
	"google.golang.org/api/gmail/v1"
)

// Gmail nests labels by name only: "Work/Clients" shows under "Work". Moving
// or renaming a label therefore renames it and every label below it, as
// Gmail's web client does.

// labelInfo is a user label with its counts.
type labelInfo struct {
	ID, Name      string
	total, unread int64
}

// labelRow is one line of the label tree. Parents that exist only as part of
// a name ("Work" for "Work/Clients" when there is no "Work" label) have no info.
type labelRow struct {
	path  string // full name
	leaf  string // last segment
	depth int
	info  *labelInfo
}

type labelsView struct {
	infos   []labelInfo
	loading bool
	err     error
	cursor  int
	offset  int
}

type labelInfosMsg struct {
	infos []labelInfo
	err   error
}

// labelOp is one label change; ops run in order.
type labelOp struct {
	kind     string // "create", "rename", "delete"
	id, name string
}

type labelOpsDoneMsg struct {
	verb string // status on success, e.g. "Moved Clients under Archive"
	done int
	err  error
}

// textInput is a one-line input dialog.
type textInput struct {
	title, hint string
	value       string
	purpose     string // "create", "rename"
	path        string // label being renamed
	err         string
}

// movePicker picks the new parent of a label.
type movePicker struct {
	path   string // label being moved
	filter string
	cursor int
}

func (m model) openLabelsView() (tea.Model, tea.Cmd) {
	m.mode = modeLabelsView
	m.status = ""
	m.lv.loading = true
	return m, fetchLabelInfos(m.service)
}

// labelRows builds the tree, sorted by path segments.
func (m model) labelRows() []labelRow {
	byPath := map[string]*labelInfo{}
	paths := map[string]bool{}
	for i := range m.lv.infos {
		in := &m.lv.infos[i]
		byPath[in.Name] = in
		segs := strings.Split(in.Name, "/")
		for j := 1; j <= len(segs); j++ {
			paths[strings.Join(segs[:j], "/")] = true
		}
	}
	var rows []labelRow
	for p := range paths {
		segs := strings.Split(p, "/")
		rows = append(rows, labelRow{path: p, leaf: segs[len(segs)-1], depth: len(segs) - 1, info: byPath[p]})
	}
	slices.SortFunc(rows, func(a, b labelRow) int {
		return slices.CompareFunc(strings.Split(strings.ToLower(a.path), "/"), strings.Split(strings.ToLower(b.path), "/"), strings.Compare)
	})
	return rows
}

func (m model) labelRow() (labelRow, bool) {
	rows := m.labelRows()
	if m.lv.cursor >= len(rows) {
		return labelRow{}, false
	}
	return rows[m.lv.cursor], true
}

// subtree returns the labels at path and below it.
func (m model) subtree(path string) []labelInfo {
	var out []labelInfo
	for _, in := range m.lv.infos {
		if in.Name == path || strings.HasPrefix(in.Name, path+"/") {
			out = append(out, in)
		}
	}
	return out
}

// renameOps renames the labels at `from` and below to start with `to`, after
// checking that no new name is taken by another label.
func (m model) renameOps(from, to string) ([]labelOp, error) {
	moving := m.subtree(from)
	if len(moving) == 0 {
		return nil, fmt.Errorf("no label at %q", from)
	}
	taken := map[string]bool{}
	for _, in := range m.lv.infos {
		taken[strings.ToLower(in.Name)] = true
	}
	for _, in := range moving {
		delete(taken, strings.ToLower(in.Name))
	}
	var ops []labelOp
	for _, in := range moving {
		name := to + strings.TrimPrefix(in.Name, from)
		if taken[strings.ToLower(name)] {
			return nil, fmt.Errorf("a label named %q already exists", name)
		}
		ops = append(ops, labelOp{kind: "rename", id: in.ID, name: name})
	}
	return ops, nil
}

// cleanLabelName validates a full label name.
func cleanLabelName(name string) (string, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return "", fmt.Errorf("name is empty")
	}
	segs := strings.Split(name, "/")
	for i, s := range segs {
		segs[i] = strings.TrimSpace(s)
		if segs[i] == "" {
			return "", fmt.Errorf("name has an empty part between slashes")
		}
	}
	return strings.Join(segs, "/"), nil
}

func parentPath(path string) string {
	if i := strings.LastIndex(path, "/"); i >= 0 {
		return path[:i]
	}
	return ""
}

func joinPath(parent, leaf string) string {
	if parent == "" {
		return leaf
	}
	return parent + "/" + leaf
}

// --- UPDATE ---
func (m model) updateLabelsView(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	rows := m.labelRows()
	h := m.labelsHeight()
	row, hasRow := m.labelRow()
	switch msg.String() {
	case "q", "esc", "#":
		m.mode = modeDay
		m.status = ""
		return m, nil
	case "j", "down":
		m.lv.cursor++
	case "k", "up":
		m.lv.cursor--
	case "pgdown", "ctrl+d":
		m.lv.cursor += h
	case "pgup", "ctrl+u":
		m.lv.cursor -= h
	case "g", "home":
		m.lv.cursor = 0
	case "G", "end":
		m.lv.cursor = len(rows)
	case "R":
		return m.openLabelsView()

	case "enter":
		if hasRow && row.info != nil {
			return m.openSubList(subList{kind: "Label", title: row.path, labelID: row.info.ID,
				back: modeLabelsView, backName: "labels"})
		}
	case "n", "N":
		in := textInput{title: "New label", hint: "Use / to nest, e.g. Work/Clients", purpose: "create"}
		if msg.String() == "N" && hasRow {
			in.title, in.value = "New label under "+row.path, row.path+"/"
		}
		m.input, m.modal = in, modalInput
	case "r":
		if hasRow {
			m.input = textInput{title: "Rename " + row.path, hint: "New name for this level; labels below move along",
				value: row.leaf, purpose: "rename", path: row.path}
			m.modal = modalInput
		}
	case "m":
		if hasRow {
			m.movePick = movePicker{path: row.path}
			m.modal = modalMove
		}
	case "d":
		switch {
		case !hasRow:
		case row.info == nil:
			m.status = "“" + row.path + "” is only a parent name; delete the labels below it instead."
		default:
			below := len(m.subtree(row.path)) - 1
			m.confirm = confirmState{kind: confirmDeleteLabel, ids: []string{row.info.ID}, text: "Delete label “" + row.path + "”?",
				detail: "Mail is not deleted; it only loses this label."}
			if below > 0 {
				m.confirm.detail += fmt.Sprintf("\n%s below it: y keeps them, a deletes them too.", count(below, "label"))
				for _, in := range m.subtree(row.path)[1:] {
					m.confirm.ids = append(m.confirm.ids, in.ID)
				}
			}
			m.modal = modalConfirm
		}
	}
	m.lv.cursor = max(0, min(m.lv.cursor, len(rows)-1))
	m.scrollLabels()
	return m, nil
}

func (m *model) scrollLabels() {
	h, n := m.labelsHeight(), len(m.labelRows())
	if m.lv.cursor < m.lv.offset {
		m.lv.offset = m.lv.cursor
	}
	if m.lv.cursor >= m.lv.offset+h {
		m.lv.offset = m.lv.cursor - h + 1
	}
	m.lv.offset = max(0, min(m.lv.offset, n-h))
}

// labelsHeight is the screen height minus title, blank, column header, status and help.
func (m model) labelsHeight() int {
	return max(1, m.height-5)
}

// runLabelOps starts label changes and reloads labels afterwards.
func (m model) runLabelOps(verb string, ops []labelOp) (tea.Model, tea.Cmd) {
	m.status = "Updating labels…"
	return m, labelOpsCmd(m.service, verb, ops)
}

func (m model) labelOpsDone(msg labelOpsDoneMsg) (tea.Model, tea.Cmd) {
	if msg.err != nil {
		m.status = errorStyle.Render("Error: " + msg.err.Error())
		if msg.done > 0 {
			m.status += errorStyle.Render(fmt.Sprintf(" (%d of the changes were made)", msg.done))
		}
	} else {
		m.status = msg.verb
	}
	return m, tea.Batch(fetchLabelInfos(m.service), fetchLabels(m.service))
}

// updateInput handles the text input dialog.
func (m model) updateInput(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	in := &m.input
	switch msg.String() {
	case "esc":
		m.modal = modalNone
	case "backspace":
		if r := []rune(in.value); len(r) > 0 {
			in.value = string(r[:len(r)-1])
		}
	case "ctrl+u":
		in.value = ""
	case "enter":
		name, err := cleanLabelName(in.value)
		if err != nil {
			in.err = err.Error()
			return m, nil
		}
		switch in.purpose {
		case "create":
			for _, l := range m.lv.infos {
				if strings.EqualFold(l.Name, name) {
					in.err = "a label with this name exists"
					return m, nil
				}
			}
			m.modal = modalNone
			return m.runLabelOps("Created "+name, []labelOp{{kind: "create", name: name}})
		case "rename":
			if strings.Contains(name, "/") {
				in.err = "use m to move a label; rename changes only its own name"
				return m, nil
			}
			to := joinPath(parentPath(in.path), name)
			ops, err := m.renameOps(in.path, to)
			if err != nil {
				in.err = err.Error()
				return m, nil
			}
			m.modal = modalNone
			return m.runLabelOps("Renamed "+in.path+" to "+to, ops)
		}
	default:
		if msg.Type == tea.KeyRunes || msg.Type == tea.KeySpace {
			in.value += string(msg.Runes)
			in.err = ""
		}
	}
	return m, nil
}

// moveTargets lists possible new parents: top level, then every path that is
// not the label itself, below it, or its current parent.
func (m model) moveTargets() []string {
	p := m.movePick.path
	targets := []string{""}
	for _, r := range m.labelRows() {
		if r.path == p || strings.HasPrefix(r.path, p+"/") || r.path == parentPath(p) {
			continue
		}
		if f := strings.ToLower(m.movePick.filter); f != "" && !strings.Contains(strings.ToLower(r.path), f) {
			continue
		}
		targets = append(targets, r.path)
	}
	if parentPath(p) == "" || m.movePick.filter != "" {
		targets = targets[1:] // already top level, or filtering
	}
	return targets
}

func (m model) updateMove(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	targets := m.moveTargets()
	switch msg.String() {
	case "esc":
		m.modal = modalNone
	case "up", "ctrl+p":
		m.movePick.cursor = max(m.movePick.cursor-1, 0)
	case "down", "ctrl+n":
		m.movePick.cursor = min(m.movePick.cursor+1, len(targets)-1)
	case "backspace":
		if r := []rune(m.movePick.filter); len(r) > 0 {
			m.movePick.filter = string(r[:len(r)-1])
			m.movePick.cursor = 0
		}
	case "enter":
		if m.movePick.cursor >= len(targets) {
			return m, nil
		}
		parent := targets[m.movePick.cursor]
		segs := strings.Split(m.movePick.path, "/")
		to := joinPath(parent, segs[len(segs)-1])
		ops, err := m.renameOps(m.movePick.path, to)
		m.modal = modalNone
		if err != nil {
			m.status = errorStyle.Render("Error: " + err.Error())
			return m, nil
		}
		where := "to the top level"
		if parent != "" {
			where = "under " + parent
		}
		return m.runLabelOps("Moved "+segs[len(segs)-1]+" "+where, ops)
	default:
		if msg.Type == tea.KeyRunes || msg.Type == tea.KeySpace {
			m.movePick.filter += string(msg.Runes)
			m.movePick.cursor = 0
		}
	}
	return m, nil
}

// --- VIEW ---
func (m model) viewLabelsView() string {
	var b strings.Builder
	rows := m.labelRows()
	b.WriteString(titleStyle.Render("Labels") + dimStyle.Render(fmt.Sprintf("  %s", count(len(m.lv.infos), "label"))) + "\n\n")
	b.WriteString(dimStyle.Render(ansi.Truncate(fmt.Sprintf(" %5s %6s  %s", "mails", "unread", "label"), m.width, "…")) + "\n")

	h := m.labelsHeight()
	switch {
	case m.lv.loading && len(rows) == 0:
		b.WriteString(" Loading labels…\n")
		h--
	case m.lv.err != nil:
		b.WriteString(" " + errorStyle.Render("Error: "+m.lv.err.Error()) + "\n")
		h--
	case len(rows) == 0:
		b.WriteString(dimStyle.Render(" No labels yet. n creates one.") + "\n")
		h--
	}
	end := min(m.lv.offset+h, len(rows))
	for i := m.lv.offset; i < end; i++ {
		b.WriteString(m.renderLabelRow(rows[i], i == m.lv.cursor) + "\n")
	}
	b.WriteString(strings.Repeat("\n", max(0, h-(end-m.lv.offset))))
	b.WriteString(m.footerStatus())
	b.WriteString(m.helpBar(keyHelp{"?", "help"}, keyHelp{"q", "back"}, keyHelp{"enter", "mails"}, keyHelp{"n", "new"},
		keyHelp{"N", "new below"}, keyHelp{"r", "rename"}, keyHelp{"m", "move"}, keyHelp{"d", "delete"}))
	return b.String()
}

func (m model) renderLabelRow(r labelRow, cursor bool) string {
	cols := fmt.Sprintf(" %5s %6s  ", "", "")
	name := r.leaf
	if r.info != nil {
		unread := ""
		if r.info.unread > 0 {
			unread = fmt.Sprint(r.info.unread)
		}
		cols = fmt.Sprintf(" %5d %6s  ", r.info.total, unread)
	}
	indent := strings.Repeat("  ", r.depth)
	if cursor {
		return selectedStyle.Width(m.width).Render(ansi.Truncate(cols+indent+name, m.width, "…"))
	}
	if r.info == nil {
		name = dimStyle.Render(name + " (parent name only)")
	} else {
		name = labelStyle.Render(name)
	}
	return ansi.Truncate(cols+dimStyle.Render(indent)+name, m.width, "…")
}

func (m model) viewInput() string {
	lines := []string{titleStyle.Render(m.input.title), dimStyle.Render(m.input.hint), "", "> " + m.input.value + "▏", ""}
	if m.input.err != "" {
		lines = append(lines, errorStyle.Render(m.input.err), "")
	}
	lines = append(lines, m.keyLine(keyHelp{"enter", "save"}, keyHelp{"ctrl+u", "clear"}, keyHelp{"esc", "cancel"}))
	return strings.Join(lines, "\n")
}

func (m model) viewMove() string {
	lines := []string{titleStyle.Render("Move " + m.movePick.path + " under"), "> " + m.movePick.filter + "▏", ""}
	targets := m.moveTargets()
	const shown = 10
	start := max(0, min(m.movePick.cursor-shown/2, len(targets)-shown))
	for i := start; i < min(start+shown, len(targets)); i++ {
		t := targets[i]
		if t == "" {
			t = "(top level)"
		}
		if i == m.movePick.cursor {
			t = selectedStyle.Render(t)
		}
		lines = append(lines, t)
	}
	if len(targets) == 0 {
		lines = append(lines, dimStyle.Render("no matching label"))
	}
	lines = append(lines, "", m.keyLine(keyHelp{"type", "filter"}, keyHelp{"enter", "move"}, keyHelp{"esc", "cancel"}))
	return strings.Join(lines, "\n")
}

// --- COMMANDS ---

// fetchLabelInfos lists user labels with their mail counts.
func fetchLabelInfos(srv *gmail.Service) tea.Cmd {
	return func() tea.Msg {
		ctx := context.Background()
		r, err := srv.Users.Labels.List("me").Context(ctx).Do()
		if err != nil {
			return labelInfosMsg{err: err}
		}
		var infos []labelInfo
		for _, l := range r.Labels {
			if l.Type == "user" {
				infos = append(infos, labelInfo{ID: l.Id, Name: l.Name})
			}
		}
		jobs := make(chan int)
		var wg sync.WaitGroup
		for range fetchWorkers {
			wg.Go(func() {
				for i := range jobs {
					l, err := withRetry(func() (*gmail.Label, error) {
						return srv.Users.Labels.Get("me", infos[i].ID).Context(ctx).Fields("messagesTotal", "messagesUnread").Do()
					})
					if err == nil {
						infos[i].total, infos[i].unread = l.MessagesTotal, l.MessagesUnread
					}
				}
			})
		}
		for i := range infos {
			jobs <- i
		}
		close(jobs)
		wg.Wait()
		return labelInfosMsg{infos: infos}
	}
}

// labelOpsCmd runs label changes in order, stopping at the first error.
func labelOpsCmd(srv *gmail.Service, verb string, ops []labelOp) tea.Cmd {
	return func() tea.Msg {
		done := 0
		for _, op := range ops {
			var err error
			switch op.kind {
			case "create":
				_, err = srv.Users.Labels.Create("me", &gmail.Label{
					Name: op.name, LabelListVisibility: "labelShow", MessageListVisibility: "show",
				}).Do()
			case "rename":
				_, err = srv.Users.Labels.Patch("me", op.id, &gmail.Label{Name: op.name}).Do()
			case "delete":
				err = srv.Users.Labels.Delete("me", op.id).Do()
			}
			if err != nil {
				return labelOpsDoneMsg{verb: verb, done: done, err: err}
			}
			done++
		}
		return labelOpsDoneMsg{verb: verb, done: done}
	}
}
