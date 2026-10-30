package application

import (
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/charmbracelet/x/ansi"
)

func TestSpanBounds(t *testing.T) {
	thu := time.Date(2026, 10, 29, 0, 0, 0, 0, time.Local)
	cases := []struct {
		s        span
		from, to string
	}{
		{spanDay, "2026-10-29", "2026-10-29"},
		{spanWeek, "2026-10-26", "2026-11-01"},
		{span7, "2026-10-23", "2026-10-29"},
		{span30, "2026-09-30", "2026-10-29"},
		{span90, "2026-08-01", "2026-10-29"},
	}
	for _, c := range cases {
		from, to := c.s.bounds(thu)
		if dayKey(from) != c.from || dayKey(to) != c.to {
			t.Errorf("%v: %s..%s", c.s, dayKey(from), dayKey(to))
		}
	}
}

func TestSpanLoadsQueuedDays(t *testing.T) {
	m := loaded(t)            // today cached
	m = press(t, m, "w", "3") // last 7 days
	if m.span != span7 || !m.loading {
		t.Fatalf("span=%v loading=%v", m.span, m.loading)
	}
	// two fetches in flight, the other four queued, newest first
	if len(m.queue) != 4 || !m.pending[dayKey(today().AddDate(0, 0, -1))] || !m.pending[dayKey(today().AddDate(0, 0, -2))] {
		t.Fatalf("queue=%d pending=%v", len(m.queue), m.pending)
	}
	v := ansi.Strip(m.View())
	if !strings.Contains(v, "Last 7 days · ") || !strings.Contains(v, "Loading 1 / 7 days") {
		t.Errorf("view:\n%s", v)
	}
	// a finished day shows at once and starts the next queued one; a stored
	// mail listed by id comes from the store
	y := today().AddDate(0, 0, -1)
	next, cmd := m.Update(dayLoadedMsg{day: dayKey(y), ids: []string{"new", "1"},
		emails: []email{{ID: "new", FromAddr: "n@x", Time: y.Add(time.Hour)}}})
	m = next.(model)
	if cmd == nil || len(m.queue) != 3 || len(m.data.emails) != 5 {
		t.Errorf("queue=%d mails=%d", len(m.queue), len(m.data.emails))
	}
	for d := 2; d < 7; d++ {
		next, _ = m.Update(dayLoadedMsg{day: dayKey(today().AddDate(0, 0, -d))})
		m = next.(model)
	}
	if m.loading || len(m.queue) != 0 {
		t.Errorf("still loading: queue=%d", len(m.queue))
	}
	if got := m.timeText(m.data.emails[0]); !strings.Contains(got, today().Format("02 Jan")) {
		t.Errorf("time column = %q", got)
	}
}

func TestSpanNavigation(t *testing.T) {
	m := loaded(t)
	m = press(t, m, "w", "4") // last 30 days
	m = press(t, m, "h")
	if want := today().AddDate(0, 0, -30); !m.day.Equal(want) {
		t.Errorf("h: %s", dayKey(m.day))
	}
	m = press(t, m, "l", "l") // second l would pass today: stays
	if !m.day.Equal(today()) {
		t.Errorf("l: %s", dayKey(m.day))
	}
	m = press(t, m, "w", "2") // this week
	from, to := m.span.bounds(m.day)
	if from.Weekday() != time.Monday || to.Sub(from) != 6*24*time.Hour && to.Sub(from) < 6*24*time.Hour-time.Hour {
		t.Errorf("week %s..%s", dayKey(from), dayKey(to))
	}
	m = press(t, m, "l") // next week starts after today
	if !m.day.Equal(today()) {
		t.Errorf("moved into next week: %s", dayKey(m.day))
	}
	m = press(t, m, "h")
	if f, _ := m.span.bounds(m.day); !f.Equal(from.AddDate(0, 0, -7)) {
		t.Errorf("previous week from %s", dayKey(f))
	}
	m = press(t, m, "c", "enter") // a day from the calendar shows that day
	if m.span != spanDay {
		t.Errorf("calendar kept span %v", m.span)
	}
}

func TestSpanRemembered(t *testing.T) {
	path := filepath.Join(t.TempDir(), "settings.json")
	m := loaded(t)
	m.settingsPath = path
	m = press(t, m, "w", "5")
	s, _ := LoadSettings(path)
	if s.Span != "90d" {
		t.Fatalf("saved span %q", s.Span)
	}
	if r := NewApplication(nil, Options{Settings: s}); r.span != span90 {
		t.Errorf("restart span %v", r.span)
	}
}
