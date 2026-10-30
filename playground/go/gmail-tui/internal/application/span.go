package application

import (
	"fmt"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
)

// The day list shows a span of days ending at (or, for a week, containing)
// model.day. Days load one by one through the day cache, newest first.

type span int

const (
	spanDay span = iota
	spanWeek
	span7
	span30
	span90
)

const rangeFetches = 2 // days of a span fetched at the same time

var spans = []struct {
	name string
	key  string // name in settings.json
}{
	spanDay:  {"Day", "day"},
	spanWeek: {"This week", "week"},
	span7:    {"Last 7 days", "7d"},
	span30:   {"Last 30 days", "30d"},
	span90:   {"Last 90 days", "90d"},
}

func (s span) String() string { return spans[s].name }

func parseSpan(key string) span {
	for i, sp := range spans {
		if sp.key == key {
			return span(i)
		}
	}
	return spanDay
}

// bounds is the first and last day of the span around `day`.
func (s span) bounds(day time.Time) (from, to time.Time) {
	switch s {
	case spanWeek:
		from = day.AddDate(0, 0, -((int(day.Weekday()) + 6) % 7)) // Monday
		return from, from.AddDate(0, 0, 6)
	case span7:
		return day.AddDate(0, 0, -6), day
	case span30:
		return day.AddDate(0, 0, -29), day
	case span90:
		return day.AddDate(0, 0, -89), day
	}
	return day, day
}

// step is how far h/l move the span, in days.
func (s span) step() int {
	switch s {
	case spanWeek, span7:
		return 7
	case span30:
		return 30
	case span90:
		return 90
	}
	return 1
}

// spanDays lists the shown span's days up to today, newest first.
func (m model) spanDays() []time.Time {
	from, to := m.span.bounds(m.day)
	if to.After(today()) {
		to = today()
	}
	var days []time.Time
	for d := to; !d.Before(from); d = d.AddDate(0, 0, -1) {
		days = append(days, d)
	}
	return days
}

// spanProgress counts the span's days that are cached.
func (m model) spanProgress() (cached, total int) {
	days := m.spanDays()
	for _, d := range days {
		if _, ok := m.days[dayKey(d)]; ok {
			cached++
		}
	}
	return cached, len(days)
}

// spanTitle is the list title, e.g. "Last 30 days · 01 Oct – 30 Oct 2026".
func (m model) spanTitle() string {
	if m.span == spanDay {
		t := m.day.Format("Mon, 02 Jan 2006")
		if m.day.Equal(today()) {
			t += " (today)"
		}
		return t
	}
	from, to := m.span.bounds(m.day)
	return m.span.String() + " · " + formatRange(from, to)
}

// loadSpan queues the span's uncached days and starts fetching them.
func (m *model) loadSpan(refresh bool) tea.Cmd {
	m.queue = nil
	for _, d := range m.spanDays() {
		k := dayKey(d)
		if _, ok := m.days[k]; ok && !refresh {
			continue
		}
		if m.pending[k] && !refresh {
			continue
		}
		m.queue = append(m.queue, d)
	}
	var cmds []tea.Cmd
	for range rangeFetches {
		cmds = append(cmds, m.nextQueued())
	}
	return tea.Batch(cmds...)
}

// nextQueued starts fetching the next queued day, if any.
func (m *model) nextQueued() tea.Cmd {
	if len(m.queue) == 0 {
		return nil
	}
	d := m.queue[0]
	m.queue = m.queue[1:]
	m.pending[dayKey(d)] = true
	return m.fetchDay(d)
}

// fetchDay fetches a day; the first fetch without a known history id also
// reads it, so the sync has a starting point.
func (m *model) fetchDay(d time.Time) tea.Cmd {
	withHistory := m.historyID == 0 && !m.historyFetch
	if withHistory {
		m.historyFetch = true
	}
	return fetchDay(m.service, d, withHistory, m.knownIDs())
}

// spanLoading reports whether any day of the span is still being fetched.
func (m model) spanLoading() bool {
	for _, d := range m.spanDays() {
		k := dayKey(d)
		if _, ok := m.days[k]; !ok || m.pending[k] {
			return true
		}
	}
	return false
}

// spanFailed sums the mails of the span that failed to load.
func (m model) spanFailed() int {
	n := 0
	for _, d := range m.spanDays() {
		n += m.days[dayKey(d)].Failed
	}
	return n
}

// inSpan reports whether a day key is part of the shown span.
func (m model) inSpan(k string) bool {
	from, to := m.span.bounds(m.day)
	return k >= dayKey(from) && k <= dayKey(to)
}

// --- SPAN PICKER ---
func (m model) updateSpanPicker(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	k := msg.String()
	switch k {
	case "esc", "q", "w":
		m.modal = modalNone
	case "j", "down":
		m.spanCursor = min(m.spanCursor+1, len(spans)-1)
	case "k", "up":
		m.spanCursor = max(m.spanCursor-1, 0)
	case "enter", " ":
		m.modal = modalNone
		return m.setSpan(span(m.spanCursor))
	default:
		if len(k) == 1 && k[0] >= '1' && int(k[0]-'1') < len(spans) {
			m.modal = modalNone
			return m.setSpan(span(k[0] - '1'))
		}
	}
	return m, nil
}

func (m model) setSpan(s span) (tea.Model, tea.Cmd) {
	m.span = s
	if m.settings.RememberView && m.settings.Span != spans[s].key {
		m.settings.Span = spans[s].key
		if err := m.settings.save(m.settingsPath); err != nil {
			m.status = errorStyle.Render("Could not save settings: " + err.Error())
		}
	}
	return m.open(m.day, m.scope, false)
}

func (m model) viewSpanPicker() string {
	lines := []string{titleStyle.Render("Show"), ""}
	for i, sp := range spans {
		line := fmt.Sprintf("%d  %s", i+1, sp.name)
		if span(i) == m.span {
			line += dimStyle.Render("  (current)")
		}
		if i == m.spanCursor {
			line = selectedStyle.Render(fmt.Sprintf("%d  %s", i+1, sp.name))
		}
		lines = append(lines, line)
	}
	lines = append(lines, "", m.keyLine(keyHelp{"1-5", "pick"}, keyHelp{"enter", "choose"}, keyHelp{"esc", "close"}))
	return strings.Join(lines, "\n")
}
