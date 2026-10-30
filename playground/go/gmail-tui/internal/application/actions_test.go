package application

import (
	"path/filepath"
	"slices"
	"strings"
	"testing"

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
	if got := ids(m.targets()); !slices.Equal(got, []string{"3", "2"}) {
		t.Fatalf("targets = %v", got)
	}
	// both read already, so m marks them unread
	next, _ := m.Update(actionDoneMsg{ids: []string{"3", "2"}, add: []string{"UNREAD"}, verb: "Marked unread:"})
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

func TestInboxScopeDropsArchived(t *testing.T) {
	m := flat(t)
	m.cache[cacheKey{day: m.key().day, scope: scopeInbox}] = newDayData([]email{{ID: "1", Labels: []string{"INBOX"}}}, 0)
	next, _ := m.Update(actionDoneMsg{ids: []string{"1"}, remove: []string{"INBOX"}, verb: "Removed Inbox from"})
	m = next.(model)
	if n := len(m.cache[cacheKey{day: m.key().day, scope: scopeInbox}].emails); n != 0 {
		t.Errorf("inbox cache still has %d", n)
	}
	if len(m.data.emails) != 3 {
		t.Errorf("all-received view lost a mail")
	}
}

func TestLabelPicker(t *testing.T) {
	m := flat(t)
	m.labels = []label{{"INBOX", "Inbox"}, {"Label_1", "Work"}, {"Label_2", "Receipts"}}
	m.data.emails[0].Labels = []string{"Label_1"}
	m = press(t, m, "L")
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

func TestLabelChips(t *testing.T) {
	m := flat(t)
	m.labels = []label{{"STARRED", "Starred"}, {"Label_1", "Work"}}
	e := email{Labels: []string{"STARRED", "Label_1", "INBOX"}}
	if got := m.labelChips(e); got != " ★ [Work]" {
		t.Errorf("chips = %q", got)
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
