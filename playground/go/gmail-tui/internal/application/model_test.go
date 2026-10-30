package application

import (
	"strings"
	"testing"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/x/ansi"
)

func key(s string) tea.KeyMsg {
	switch s {
	case "enter":
		return tea.KeyMsg{Type: tea.KeyEnter}
	case "esc":
		return tea.KeyMsg{Type: tea.KeyEsc}
	case "tab":
		return tea.KeyMsg{Type: tea.KeyTab}
	case " ":
		return tea.KeyMsg{Type: tea.KeySpace, Runes: []rune(" ")}
	}
	return tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune(s)}
}

func press(t *testing.T, m model, keys ...string) model {
	t.Helper()
	for _, k := range keys {
		next, _ := m.Update(key(k))
		m = next.(model)
	}
	return m
}

func loaded(t *testing.T) model {
	t.Helper()
	m := NewApplication(nil)
	m.width, m.height = 90, 14
	t0 := today().Add(9 * time.Hour)
	next, _ := m.Update(dayLoadedMsg{key: m.key(), emails: []email{
		{ID: "1", FromName: "GitHub", FromAddr: "gh@x", Subject: "PR merged", Time: t0, Unread: true, Unsubscribe: "https://gh/u"},
		{ID: "2", FromName: "GitHub", FromAddr: "gh@x", Subject: "CI failed", Time: t0.Add(time.Hour)},
		{ID: "3", FromName: "Bank", FromAddr: "bank@x", Subject: "Statement", Time: t0.Add(2 * time.Hour)},
	}})
	return next.(model)
}

func TestDayFoldAndRead(t *testing.T) {
	m := loaded(t)
	if len(m.rows) != 5 {
		t.Fatalf("rows = %d, want 5", len(m.rows))
	}
	m = press(t, m, " ") // fold GitHub
	if len(m.rows) != 3 || m.cursor != 0 {
		t.Fatalf("after fold rows=%d cursor=%d", len(m.rows), m.cursor)
	}
	m = press(t, m, " ", "j", "enter") // unfold, open newest GitHub mail
	if m.mode != modeReader || m.reader.email.ID != "2" {
		t.Fatalf("mode=%v reader=%q", m.mode, m.reader.email.ID)
	}
	next, _ := m.Update(messageLoadedMsg{id: "2", msg: &message{From: "GitHub <gh@x>", Date: "today", Body: "line one\nline two"}})
	m = next.(model)
	if !strings.Contains(ansi.Strip(m.View()), "line two") {
		t.Errorf("reader view missing body:\n%s", ansi.Strip(m.View()))
	}
	m = press(t, m, "n") // next mail is PR merged (ID 1)
	if m.reader.email.ID != "1" {
		t.Errorf("n opened %q", m.reader.email.ID)
	}
	m = press(t, m, "q")
	if m.mode != modeDay {
		t.Errorf("q did not return to day view")
	}
}

func TestStaleDayIgnored(t *testing.T) {
	m := loaded(t)
	m = press(t, m, "h") // yesterday, starts loading
	next, _ := m.Update(dayLoadedMsg{key: cacheKey{day: "2000-01-01"}, emails: []email{{FromAddr: "x"}}})
	m = next.(model)
	if !m.loading || len(m.rows) != 0 {
		t.Errorf("stale load applied")
	}
	m = press(t, m, "l") // back to today, served from cache
	if m.loading || len(m.rows) != 5 {
		t.Errorf("cache not used: loading=%v rows=%d", m.loading, len(m.rows))
	}
}

func TestStatsView(t *testing.T) {
	m := loaded(t)
	m = press(t, m, "s")
	if m.mode != modeStats || !m.stats.loading {
		t.Fatalf("stats not loading")
	}
	next, _ := m.Update(statsLoadedMsg{key: m.stats.key, emails: []email{
		{FromName: "GitHub", FromAddr: "gh@x", Time: today(), Unsubscribe: "mailto:u@gh"},
		{FromName: "GitHub", FromAddr: "gh@x", Time: today()},
		{FromName: "Bank", FromAddr: "bank@x", Time: today()},
	}})
	m = next.(model)
	view := ansi.Strip(m.View())
	if !strings.Contains(view, "GitHub <gh@x>") || !strings.Contains(view, "3 mails · 2 senders") {
		t.Errorf("stats view:\n%s", view)
	}
	_, cmd := m.Update(key("u"))
	if got := cmd(); got != statusMsg("Unsubscribe by mail: u@gh") {
		t.Errorf("u = %v", got)
	}
	m = press(t, m, "tab")
	if m.stats.days != 30 {
		t.Errorf("tab days = %d", m.stats.days)
	}
}
