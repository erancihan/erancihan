package application

import (
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/charmbracelet/x/ansi"
)

func page(n, start int, base time.Time) []email {
	var es []email
	for i := range n {
		es = append(es, email{ID: fmt.Sprint("a", start+i), FromName: "S", FromAddr: "s@x",
			Subject: fmt.Sprint("old ", start+i), Time: base.AddDate(0, 0, -(start + i)), Unread: true,
			Labels: []string{"INBOX", "UNREAD"}})
	}
	return es
}

// pageMsg is a fetched page whose mails were all new to the store.
func pageMsg(gen int, es []email, next string, estimate int64) allLoadedMsg {
	return allLoadedMsg{gen: gen, ids: ids(es), emails: es, next: next, estimate: estimate}
}

func allOpen(t *testing.T) model {
	t.Helper()
	m := flat(t)
	m.width, m.height = 120, 20
	m = press(t, m, "a")
	if m.list != listAll || !m.all.loading || m.allQuery() != "-in:sent -in:drafts -in:chats is:unread" {
		t.Fatalf("all view: list=%v loading=%v q=%q", m.list, m.all.loading, m.allQuery())
	}
	next, _ := m.Update(pageMsg(m.all.gen, page(30, 1, today()), "p2", 340))
	return next.(model)
}

func TestAllListLoadsAndPages(t *testing.T) {
	m := allOpen(t)
	if len(m.rows) != 30 || m.all.loading {
		t.Fatalf("rows=%d loading=%v", len(m.rows), m.all.loading)
	}
	v := ansi.Strip(m.View())
	if !strings.Contains(v, "All mail · Unread") || !strings.Contains(v, "30 of ≈340 loaded") || !strings.Contains(v, "Date") {
		t.Errorf("view:\n%s", v)
	}
	// moving near the end loads the next page once
	m = press(t, m, "G")
	if !m.all.loading {
		t.Fatal("next page not requested")
	}
	if cmd := m.loadMoreIfNeeded(); cmd != nil {
		t.Error("requested twice")
	}
	next, _ := m.Update(pageMsg(m.all.gen, page(5, 31, today()), "", 0))
	m = next.(model)
	if len(m.rows) != 35 || m.all.next != "" {
		t.Errorf("rows=%d next=%q", len(m.rows), m.all.next)
	}
}

func TestAllListFilterSearchAndStale(t *testing.T) {
	m := allOpen(t)
	old := m.all.gen
	m = press(t, m, "f")
	if m.all.filter != filterAll || m.all.gen == old || len(m.all.ids) != 0 || strings.Contains(m.allQuery(), "is:unread") {
		t.Errorf("filter: %v gen=%d q=%q", m.all.filter, m.all.gen, m.allQuery())
	}
	next, _ := m.Update(pageMsg(old, page(3, 1, today()), "", 0)) // stale page
	m = next.(model)
	if len(m.all.ids) != 0 {
		t.Errorf("stale page applied")
	}
	m = press(t, m, "/")
	for _, r := range "from:github" {
		m = press(t, m, string(r))
	}
	next, _ = m.Update(key("enter"))
	m = next.(model)
	if m.all.search != "from:github" || !strings.HasSuffix(m.allQuery(), " from:github") {
		t.Errorf("search q=%q", m.allQuery())
	}
}

func TestAllListActionsAndBack(t *testing.T) {
	m := allOpen(t)
	m = press(t, m, "x", "x")
	if got := len(selTargets(m)); got != 2 {
		t.Fatalf("targets = %d", got)
	}
	next, _ := m.Update(actionDoneMsg{ids: []string{"a1", "a2"}, remove: []string{"UNREAD"}, verb: "Marked read:", bulk: true})
	m = next.(model)
	if m.data.emails[0].Unread || len(m.data.emails) != 30 {
		t.Errorf("read mail should stay listed but read: %+v", m.data.emails[0])
	}
	next, _ = m.Update(actionDoneMsg{ids: []string{"a3"}, trash: true, verb: "Moved to Trash:"})
	m = next.(model)
	if len(m.data.emails) != 29 {
		t.Errorf("trashed mail still listed")
	}
	// selection made in the all list survives going back to the day view
	m = press(t, m, "x", "esc")
	if m.list != listDay || len(m.selected) != 1 || !strings.Contains(ansi.Strip(m.View()), "1 selected (1 on other days)") {
		t.Errorf("back: list=%v selected=%v\n%s", m.list, m.selected, ansi.Strip(m.View()))
	}
	// returning keeps the loaded list
	m = press(t, m, "a")
	if m.all.loading || len(m.rows) != 29 {
		t.Errorf("reopen refetched: loading=%v rows=%d", m.all.loading, len(m.rows))
	}
}

func TestTimeText(t *testing.T) {
	m := allOpen(t)
	ty := today()
	if got := m.timeText(email{Time: ty.Add(9 * time.Hour)}); got != "09:00" {
		t.Errorf("today = %q", got)
	}
	if got := m.timeText(email{Time: time.Date(ty.Year()-1, 3, 5, 0, 0, 0, 0, time.Local)}); got != fmt.Sprintf("%d-03-05", ty.Year()-1) {
		t.Errorf("older = %q", got)
	}
}

func TestAllListUsesStore(t *testing.T) {
	m := flat(t) // today's 3 mails are stored
	m = press(t, m, "a")
	known := m.knownIDs()
	if !known["1"] || !known["3"] {
		t.Fatalf("store not passed: %v", known)
	}
	// a page listing two stored mails and one new one: only the new one comes with metadata
	next, _ := m.Update(allLoadedMsg{gen: m.all.gen, ids: []string{"3", "new", "1"},
		emails: []email{{ID: "new", FromAddr: "n@x", Time: today().AddDate(0, -2, 0), Labels: []string{"UNREAD"}, Unread: true}}})
	m = next.(model)
	if len(m.rows) != 3 || len(m.mails) != 4 {
		t.Fatalf("rows=%d mails=%d", len(m.rows), len(m.mails))
	}
	// one stored copy: marking read in the all list shows in the day view too
	next, _ = m.Update(actionDoneMsg{ids: []string{"1"}, remove: []string{"UNREAD"}, verb: "Marked read:"})
	m = next.(model)
	m = press(t, m, "a")
	for _, e := range m.data.emails {
		if e.ID == "1" && e.Unread {
			t.Error("day view kept a stale copy")
		}
	}
}
