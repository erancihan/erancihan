package application

import (
	"strings"
	"testing"

	"github.com/charmbracelet/x/ansi"
)

func TestCalendarNavigateAndOpen(t *testing.T) {
	m := loaded(t)
	m.width, m.height = 100, 30
	m = press(t, m, "c")
	if m.modal != modalCalendar || !m.cal.cursor.Equal(today()) {
		t.Fatal("calendar not open on the shown day")
	}
	m = press(t, m, "l") // cannot go past today
	if !m.cal.cursor.Equal(today()) {
		t.Errorf("moved into the future")
	}
	m = press(t, m, "k", "h") // a week and a day back
	want := today().AddDate(0, 0, -8)
	if !m.cal.cursor.Equal(want) || !m.cal.month.Equal(firstOfMonth(want)) {
		t.Errorf("cursor %s month %s", dayKey(m.cal.cursor), dayKey(m.cal.month))
	}
	m = press(t, m, "[")
	if !m.cal.month.Equal(firstOfMonth(want.AddDate(0, -1, 0))) {
		t.Errorf("[ did not go a month back: %s", dayKey(m.cal.month))
	}
	m = press(t, m, "t", "enter")
	if m.modal != modalNone || !m.day.Equal(today()) {
		t.Errorf("enter did not open today")
	}
}

func TestCalendarCounts(t *testing.T) {
	m := loaded(t) // today cached: 3 mails, 1 unread
	m.width, m.height = 100, 30
	y := today().AddDate(0, 0, -1)
	m.counts[countKey{dayKey(y), m.scope}] = dayCount{total: 12, unread: 4}
	if c, ok := m.dayCount(today()); !ok || c != (dayCount{3, 1}) {
		t.Errorf("today from cache = %+v %v", c, ok)
	}
	if c, ok := m.dayCount(y); !ok || c.total != 12 {
		t.Errorf("yesterday from counts = %+v %v", c, ok)
	}
	next, _ := m.Update(countsMsg{scope: m.scope, counts: map[string]dayCount{"2026-01-01": {5, 0}}, failed: []string{"2026-01-02"}})
	m = next.(model)
	if m.counts[countKey{"2026-01-01", m.scope}].total != 5 || !strings.Contains(m.status, "Could not count 1 day") {
		t.Errorf("counts not applied: %v %q", m.counts, m.status)
	}

	m = press(t, m, "c")
	if !m.countPending[countKey{dayKey(firstOfMonth(today())), m.scope}] && today().Day() > 1 {
		t.Errorf("first of month not requested")
	}
	if m.countPending[countKey{dayKey(today()), m.scope}] {
		t.Errorf("cached today requested")
	}
	v := ansi.Strip(m.View())
	if !strings.Contains(v, today().Format("January 2006")) || !strings.Contains(v, "3 ●1") {
		t.Errorf("view:\n%s", v)
	}
}
