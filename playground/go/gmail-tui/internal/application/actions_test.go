package application

import (
	"path/filepath"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/charmbracelet/x/ansi"
)

func flat(t *testing.T) model {
	t.Helper()
	m := loaded(t)
	m.settings.GroupBySender = false
	m.rebuild()
	return m
}

func TestFlatIsNewestFirst(t *testing.T) {
	m := flat(t)
	var got []string
	for _, r := range m.rows {
		e, _ := m.rowEmail(r)
		got = append(got, e.ID)
	}
	if !slices.Equal(got, []string{"3", "2", "1"}) {
		t.Errorf("flat order = %v", got)
	}
}

func TestSettingsToggleGrouping(t *testing.T) {
	m := flat(t)
	m.settingsPath = filepath.Join(t.TempDir(), "settings.json")
	m = press(t, m, "j") // cursor on mail 2
	m = press(t, m, ",", " ", "esc")
	if !m.settings.GroupBySender || len(m.rows) != 5 {
		t.Fatalf("grouping not on: rows=%d", len(m.rows))
	}
	if e, _ := m.selectedEmail(); e.ID != "2" {
		t.Errorf("cursor moved to %q", e.ID)
	}
	s, err := LoadSettings(m.settingsPath)
	if err != nil || !s.GroupBySender || !s.MarkReadOnOpen {
		t.Errorf("saved settings = %+v, %v", s, err)
	}
}

func TestSelectAndBulkRead(t *testing.T) {
	m := flat(t)
	m = press(t, m, "x", "x") // select 3 and 2
	if len(m.selected) != 2 || !m.selected["3"] || !m.selected["2"] {
		t.Fatalf("selected = %v", m.selected)
	}
	if got := ids(selTargets(m)); !slices.Equal(got, []string{"3", "2"}) {
		t.Fatalf("targets = %v", got)
	}
	// both read already, so m marks them unread
	next, _ := m.Update(actionDoneMsg{ids: []string{"3", "2"}, add: []string{"UNREAD"}, verb: "Marked unread:", bulk: true})
	m = next.(model)
	if !m.data.emails[0].Unread || !m.data.emails[1].Unread || len(m.selected) != 0 {
		t.Errorf("not applied: %+v selected=%v", m.data.emails, m.selected)
	}
	if m.status != "Marked unread: 2 mails" {
		t.Errorf("status = %q", m.status)
	}
}

func TestGroupHeaderSelectsGroup(t *testing.T) {
	m := loaded(t) // grouped: GitHub (2) first
	m = press(t, m, "x")
	if len(m.selected) != 2 || !m.selected["1"] || !m.selected["2"] {
		t.Errorf("selected = %v", m.selected)
	}
	m = press(t, m, "A")
	if len(m.selected) != 3 {
		t.Errorf("A selected %d", len(m.selected))
	}
	m = press(t, m, "A")
	if len(m.selected) != 0 {
		t.Errorf("A did not clear")
	}
}

func TestTrashConfirmAndRemove(t *testing.T) {
	m := flat(t)
	m.height = 20
	m = press(t, m, "d")
	if m.modal != modalConfirm || !strings.Contains(ansi.Strip(m.View()), "Move 1 mail to Trash?") {
		t.Fatalf("no confirm:\n%s", ansi.Strip(m.View()))
	}
	m = press(t, m, "n")
	if m.modal != modalNone {
		t.Fatalf("n did not cancel")
	}
	next, _ := m.Update(actionDoneMsg{ids: []string{"3"}, trash: true, verb: "Moved to Trash:"})
	m = next.(model)
	if len(m.data.emails) != 2 || len(m.rows) != 2 {
		t.Errorf("trashed mail still listed: %d", len(m.data.emails))
	}
}

func TestInboxScopeFiltersLocally(t *testing.T) {
	m := flat(t)
	setLabels(&m, 0, []string{"INBOX"})
	m = press(t, m, "tab")
	if m.scope != scopeInbox || len(m.data.emails) != 1 || m.loading {
		t.Fatalf("inbox view: scope=%v mails=%d loading=%v", m.scope, len(m.data.emails), m.loading)
	}
	next, _ := m.Update(actionDoneMsg{ids: []string{m.data.emails[0].ID}, remove: []string{"INBOX"}, verb: "Removed Inbox from"})
	m = next.(model)
	if len(m.data.emails) != 0 {
		t.Errorf("archived mail still in inbox view")
	}
	m = press(t, m, "tab")
	if len(m.data.emails) != 3 {
		t.Errorf("all-received view lost a mail: %d", len(m.data.emails))
	}
}

func TestLabelPicker(t *testing.T) {
	m := flat(t)
	m.labels = []label{{"INBOX", "Inbox"}, {"Label_1", "Work"}, {"Label_2", "Receipts"}}
	setLabels(&m, 0, []string{"Label_1"})
	m.refreshView()
	m = press(t, m, "v")
	if m.modal != modalLabels {
		t.Fatal("picker not open")
	}
	m = press(t, m, "w", "o")
	items := m.pickItems()
	if len(items) != 2 || items[0].label.Name != "Work" || !items[1].create {
		t.Fatalf("filtered = %+v", items)
	}
	if !strings.Contains(ansi.Strip(m.View()), "[x] Work") {
		t.Errorf("Work not checked:\n%s", ansi.Strip(m.View()))
	}
	m = press(t, m, "r", "k")
	if items := m.pickItems(); len(items) != 1 || items[0].create {
		t.Errorf("exact match should hide create row: %+v", items)
	}
	m.picker.filter = "Travel"
	if items := m.pickItems(); len(items) != 1 || !items[0].create {
		t.Errorf("create row missing: %+v", items)
	}
}

func TestLabelText(t *testing.T) {
	m := flat(t)
	m.labels = []label{{"STARRED", "Starred"}, {"Label_1", "Work"}, {"Label_2", "Receipts"}}
	e := email{Labels: []string{"STARRED", "Label_1", "Label_2", "INBOX"}}
	if got := m.labelText(e); got != "★ Work, Receipts" {
		t.Errorf("labels = %q", got)
	}
}

func TestWithLabels(t *testing.T) {
	got := withLabels([]string{"INBOX", "UNREAD"}, []string{"Label_1"}, []string{"UNREAD"})
	if !slices.Equal(got, []string{"INBOX", "Label_1"}) {
		t.Errorf("withLabels = %v", got)
	}
}

func TestBackgroundReadKeepsSelection(t *testing.T) {
	m := flat(t)
	m = press(t, m, "x")
	next, _ := m.Update(actionDoneMsg{ids: []string{"1"}, remove: []string{"UNREAD"}})
	m = next.(model)
	if len(m.selected) != 1 || m.status != "" {
		t.Errorf("selection=%v status=%q", m.selected, m.status)
	}
}

func TestSelectionSurvivesReaderAndDays(t *testing.T) {
	m := flat(t)
	m = press(t, m, "x", "enter")                                                      // select 3, open 2
	next, _ := m.Update(actionDoneMsg{ids: []string{"2"}, remove: []string{"UNREAD"}}) // mark read on open
	m = next.(model)
	m = press(t, m, "esc", "h") // back to list, then to yesterday
	next, _ = m.Update(dayLoadedMsg{day: dayKey(m.day), emails: []email{{ID: "y1", Time: m.day.Add(time.Hour)}}})
	m = next.(model)
	m.width = 200
	m = press(t, m, "x") // select y1 too
	if len(m.selected) != 2 || !m.selected["3"] || !m.selected["y1"] {
		t.Fatalf("selected = %v", m.selected)
	}
	if !strings.Contains(ansi.Strip(m.View()), "2 selected (1 on other days)") {
		t.Errorf("title:\n%s", ansi.Strip(m.View()))
	}
	if got := ids(selTargets(m)); !slices.Equal(got, []string{"3", "y1"}) {
		t.Errorf("targets = %v", got)
	}
	m = press(t, m, "A") // all of yesterday is selected already → unselect it, keep today's
	if len(m.selected) != 1 || !m.selected["3"] {
		t.Errorf("A on day = %v", m.selected)
	}
	m = press(t, m, "X")
	if len(m.selected) != 0 {
		t.Errorf("X did not clear")
	}
}

func TestTrashPrunesSelection(t *testing.T) {
	m := flat(t)
	m = press(t, m, "x", "x")
	next, _ := m.Update(actionDoneMsg{ids: []string{"3"}, trash: true}) // e.g. trashed from the reader
	m = next.(model)
	if len(m.selected) != 1 || !m.selected["2"] {
		t.Errorf("selected = %v", m.selected)
	}
}

func TestUnreadCounts(t *testing.T) {
	m := flat(t)
	m.width = 200
	if strings.Contains(ansi.Strip(m.View()), "Inbox:") {
		t.Error("inbox count shown before it is known")
	}
	next, _ := m.Update(inboxUnreadMsg{n: 128})
	m = next.(model)
	if v := ansi.Strip(m.View()); !strings.Contains(v, "3 mails · 1 unread") || !strings.Contains(v, "Inbox: 128 unread") {
		t.Errorf("title:\n%s", v)
	}
}

func TestArchiveToggle(t *testing.T) {
	m := flat(t)
	setLabels(&m, 0, []string{"INBOX"}) // 3 in inbox, 2 archived
	m.refreshView()
	m = press(t, m, "x", "x")
	if !slices.ContainsFunc(selTargets(m), inInbox) {
		t.Fatal("setup: expected an inbox mail among targets")
	}
	next, _ := m.Update(actionDoneMsg{ids: []string{"3", "2"}, remove: []string{"INBOX"}, verb: "Archived:", bulk: true})
	m = next.(model)
	if slices.ContainsFunc(m.data.emails, inInbox) || m.status != "Archived: 2 mails" || len(m.selected) != 0 {
		t.Errorf("not archived: status=%q selected=%v", m.status, m.selected)
	}
	if len(m.data.emails) != 3 {
		t.Errorf("archived mail left the All received view")
	}
	m = press(t, m, "tab")
	if len(m.data.emails) != 0 {
		t.Errorf("inbox view still lists %d", len(m.data.emails))
	}
}

func TestRememberView(t *testing.T) {
	path := filepath.Join(t.TempDir(), "settings.json")
	m := flat(t)
	m.settingsPath = path
	m = press(t, m, "tab")
	s, _ := LoadSettings(path)
	if s.View != "inbox" {
		t.Fatalf("view not saved: %+v", s)
	}
	if r := NewApplication(nil, Options{Settings: s, SettingsPath: path}); r.scope != scopeInbox {
		t.Errorf("restart did not restore inbox")
	}

	// with the setting off, the app starts on All received and tab saves nothing
	m = press(t, m, ",", "j", "j", " ", "esc")
	if m.settings.RememberView {
		t.Fatal("setting not toggled off")
	}
	m = press(t, m, "tab", "tab")
	s, _ = LoadSettings(path)
	if s.RememberView || s.View != "inbox" {
		t.Errorf("saved %+v", s)
	}
	if r := NewApplication(nil, Options{Settings: s}); r.scope != scopeReceived {
		t.Errorf("restored view although the setting is off")
	}
}

// setLabels sets the labels of the i-th (newest first) stored mail of the shown day.
func setLabels(m *model, i int, labels []string) {
	id := m.days[dayKey(m.day)].IDs[i]
	e := m.mails[id]
	e.Labels = labels
	m.mails[id] = e
}

func confirmText(t *testing.T, m model, k string) string {
	t.Helper()
	next, _ := m.Update(key(k))
	nm := next.(model)
	if nm.modal != modalConfirm {
		return "status: " + nm.status
	}
	return nm.confirm.text
}

func TestShiftForSelection(t *testing.T) {
	m := flat(t)              // setting on by default
	m = press(t, m, "x", "x") // select 3 and 2, cursor on 1
	if got := confirmText(t, m, "d"); got != "Move 1 mail to Trash?" {
		t.Errorf("d = %q", got)
	}
	if got := confirmText(t, m, "D"); got != "Move 2 mails to Trash?" {
		t.Errorf("D = %q", got)
	}
	m = press(t, m, "X")
	if got := confirmText(t, m, "D"); got != "status: Nothing selected (x selects a mail)" {
		t.Errorf("D without selection = %q", got)
	}
	if !strings.Contains(ansi.Strip(m.View()), "e archive") {
		t.Errorf("footer:\n%s", ansi.Strip(m.View()))
	}

	// in the reader: d is the open mail, D the selection
	m = press(t, m, "g", "x", "enter")
	if got := confirmText(t, m, "d"); got != "Move 1 mail to Trash?" {
		t.Errorf("reader d = %q", got)
	}
	m = press(t, m, "q", "x", "enter") // select a second one, open it
	if got := confirmText(t, m, "D"); got != "Move 2 mails to Trash?" {
		t.Errorf("reader D = %q", got)
	}
}

func TestShiftSettingOff(t *testing.T) {
	m := flat(t)
	m.settings.ShiftSelection = false
	m = press(t, m, "x", "x")
	if got := confirmText(t, m, "d"); got != "Move 2 mails to Trash?" {
		t.Errorf("d with selection = %q", got)
	}
	m = press(t, m, "enter") // reader still acts on the open mail
	if got := confirmText(t, m, "D"); got != "Move 1 mail to Trash?" {
		t.Errorf("reader D = %q", got)
	}
}

// selTargets is what a Shift action would act on.
func selTargets(m model) []email {
	es, _ := m.actionTargets(true, m.cursorTargets())
	return es
}

func TestCursorActionKeepsSelection(t *testing.T) {
	m := flat(t)
	m = press(t, m, "x", "x") // select 3 and 2; cursor on 1
	// a cursor action (e on mail 1) finishes: the selection stays
	next, _ := m.Update(actionDoneMsg{ids: []string{"1"}, remove: []string{"INBOX"}, verb: "Archived:"})
	m = next.(model)
	if len(m.selected) != 2 {
		t.Fatalf("cursor action cleared the selection: %v", m.selected)
	}
	// a Shift action finishes: its mails leave the selection, failed ones stay
	next, _ = m.Update(actionDoneMsg{ids: []string{"3"}, remove: []string{"UNREAD"}, verb: "Marked read:", bulk: true, failed: 1})
	m = next.(model)
	if len(m.selected) != 1 || !m.selected["2"] {
		t.Errorf("bulk action: selected = %v", m.selected)
	}
	// the flag is set by the key: E is bulk, e is not
	_, cmd := m.Update(key("E"))
	if cmd == nil {
		t.Fatal("E produced no command")
	}
	if _, bulk := m.actionTargets(true, m.cursorTargets()); !bulk {
		t.Error("Shift targets not marked as selection")
	}
	if _, bulk := m.actionTargets(false, m.cursorTargets()); bulk {
		t.Error("cursor targets marked as selection")
	}
}

func TestTrashInReaderOpensNext(t *testing.T) {
	m := flat(t) // 3, 2, 1 newest first
	m = press(t, m, "j", "enter")
	if m.reader.email.ID != "2" {
		t.Fatalf("reading %q", m.reader.email.ID)
	}
	next, _ := m.Update(actionDoneMsg{ids: []string{"2"}, trash: true, verb: "Moved to Trash:"})
	m = next.(model)
	if m.mode != modeReader || m.reader.email.ID != "1" || m.status != "Moved to Trash: 1 mail" {
		t.Errorf("mode=%v reading=%q status=%q", m.mode, m.reader.email.ID, m.status)
	}
	// at the end of the list it moves to the mail above
	next, _ = m.Update(actionDoneMsg{ids: []string{"1"}, trash: true, verb: "Moved to Trash:"})
	m = next.(model)
	if m.mode != modeReader || m.reader.email.ID != "3" {
		t.Errorf("after last: mode=%v reading=%q", m.mode, m.reader.email.ID)
	}
}
