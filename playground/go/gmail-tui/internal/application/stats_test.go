package application

import (
	"testing"
	"time"
)

func TestStatsRangeNavigation(t *testing.T) {
	m := loaded(t)
	m = press(t, m, "s")
	if m.stats.days() != 7 || !m.stats.to.Equal(today()) {
		t.Fatalf("default range %s..%s", dayKey(m.stats.from), dayKey(m.stats.to))
	}
	m = press(t, m, "h")
	if want := today().AddDate(0, 0, -7); !m.stats.to.Equal(want) || m.stats.days() != 7 {
		t.Errorf("h: %s..%s", dayKey(m.stats.from), dayKey(m.stats.to))
	}
	m = press(t, m, "tab") // 30 days ending at the same day
	if m.stats.days() != 30 || !m.stats.to.Equal(today().AddDate(0, 0, -7)) {
		t.Errorf("tab: %d days to %s", m.stats.days(), dayKey(m.stats.to))
	}
	m = press(t, m, "l") // would pass today: clamps to a range ending today
	if !m.stats.to.Equal(today()) || m.stats.days() != 30 {
		t.Errorf("l: %d days to %s", m.stats.days(), dayKey(m.stats.to))
	}
	m = press(t, m, "tab", "tab") // 90, then back to 7
	if m.stats.days() != 7 {
		t.Errorf("tab cycle: %d", m.stats.days())
	}
}

func TestStatsFromCacheAndFill(t *testing.T) {
	m := loaded(t)
	m.historyID = 5
	// one-day range on a cached day is counted locally, no fetch
	next, cmd := m.openStats(today(), today(), false)
	m = next.(model)
	if cmd != nil || m.stats.loading || m.stats.data.total != 3 {
		t.Fatalf("local: loading=%v total=%d", m.stats.loading, m.stats.data.total)
	}

	// a fetched 3-day range fills the two missing days, including an empty one
	from := today().AddDate(0, 0, -2)
	next, _ = m.openStats(from, today(), false)
	m = next.(model)
	if !m.stats.loading {
		t.Fatal("expected fetch")
	}
	next, _ = m.Update(statsLoadedMsg{key: m.stats.key, from: from, to: today(),
		emails: []email{{ID: "old", FromAddr: "a@x", Time: from.Add(time.Hour)}}})
	m = next.(model)
	if len(m.dayMails(dayKey(from))) != 1 || len(m.dayMails(dayKey(from.AddDate(0, 0, 1)))) != 0 {
		t.Errorf("days not filled: %v", m.days)
	}
	if _, ok := m.days[dayKey(from.AddDate(0, 0, 1))]; !ok {
		t.Errorf("empty day not cached")
	}
	if len(m.dayMails(dayKey(today()))) != 3 {
		t.Errorf("cached today overwritten")
	}
	// now the range is all cached
	next, cmd = m.openStats(from, today(), false)
	if cmd != nil || next.(model).stats.data.total != 4 {
		t.Errorf("not local after fill")
	}
}

func TestCustomRange(t *testing.T) {
	m := loaded(t)
	m = press(t, m, "s", "c")
	if m.modal != modalRange {
		t.Fatal("range dialog not open")
	}
	for range 10 {
		m = press(t, m, "backspace")
	}
	from := today().AddDate(0, 0, -14)
	for _, r := range dayKey(from) {
		m = press(t, m, string(r))
	}
	m = press(t, m, "x") // ignored: not a date character
	next, _ := m.Update(key("enter"))
	m = next.(model)
	if m.modal != modalNone || !m.stats.from.Equal(from) || !m.stats.to.Equal(today()) {
		t.Errorf("range %s..%s modal=%v err=%q", dayKey(m.stats.from), dayKey(m.stats.to), m.modal, m.rangeIn.err)
	}
}

func TestParseRange(t *testing.T) {
	cases := []struct {
		from, to string
		ok       bool
	}{
		{"2026-01-01", "2026-01-31", true},
		{"2026-02-01", "2026-01-31", false},
		{"2026-1-1", "2026-01-31", false},
		{dayKey(today()), dayKey(today().AddDate(0, 0, 1)), false},
		{"2024-01-01", "2026-01-01", false},
	}
	for _, c := range cases {
		_, _, err := parseRange(rangeInput{fields: [2]string{c.from, c.to}})
		if (err == nil) != c.ok {
			t.Errorf("%s..%s: err=%v", c.from, c.to, err)
		}
	}
}
