package application

import (
	"fmt"
	"slices"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/x/ansi"
	"google.golang.org/api/gmail/v1"
)

// statsRanges are the selectable window sizes in days; tab cycles through them.
var statsRanges = []int{7, 30, 90}

// --- MODEL ---
type statsKey struct {
	end   string // last day of the window, YYYY-MM-DD
	days  int
	scope scope
}

type senderStat struct {
	name, addr  string
	unsubscribe string
	count       int
	unread      int
	last        time.Time
}

type statsData struct {
	senders   []senderStat
	total     int
	failed    int
	truncated bool
}

type stats struct {
	days    int
	key     statsKey
	data    statsData
	loading bool
	err     error
	cursor  int
	offset  int
}

type statsLoadedMsg struct {
	key       statsKey
	emails    []email
	failed    int
	truncated bool
	err       error
}

// openStats shows sender counts for the `days` days ending at the current day.
func (m model) openStats(days int, refresh bool) (tea.Model, tea.Cmd) {
	m.mode = modeStats
	m.status = ""
	key := statsKey{end: m.day.Format(time.DateOnly), days: days, scope: m.scope}
	m.stats = stats{days: days, key: key}
	if d, ok := m.statsCache[key]; ok && !refresh {
		m.stats.data = d
		return m, nil
	}
	m.stats.loading = true
	return m, fetchStats(m.service, m.day, days, m.scope, key)
}

func (m model) statsLoaded(msg statsLoadedMsg) (tea.Model, tea.Cmd) {
	var d statsData
	if msg.err == nil {
		d = statsData{senders: summarize(msg.emails), total: len(msg.emails), failed: msg.failed, truncated: msg.truncated}
		m.statsCache[msg.key] = d
	}
	if msg.key == m.stats.key {
		m.stats.loading = false
		m.stats.err = msg.err
		m.stats.data = d
		m.stats.scroll(m.statsHeight())
	}
	return m, nil
}

// summarize counts mails per sender, busiest first.
func summarize(emails []email) []senderStat {
	var out []senderStat
	for _, g := range groupBySender(emails) {
		s := senderStat{name: g.name, addr: g.key, unsubscribe: g.unsubscribe(), count: len(g.emails), last: g.emails[0].Time}
		for _, e := range g.emails {
			if e.Unread {
				s.unread++
			}
		}
		out = append(out, s)
	}
	return out
}

// statsHeight is the screen height minus title, blank, column header, status and help.
func (m model) statsHeight() int {
	return max(1, m.height-5)
}

func (s *stats) scroll(h int) {
	s.cursor = max(0, min(s.cursor, len(s.data.senders)-1))
	if s.cursor < s.offset {
		s.offset = s.cursor
	}
	if s.cursor >= s.offset+h {
		s.offset = s.cursor - h + 1
	}
	s.offset = max(0, min(s.offset, len(s.data.senders)-h))
}

// --- UPDATE ---
func (m model) updateStats(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	h := m.statsHeight()
	switch msg.String() {
	case "q", "esc", "s":
		m.mode = modeDay
		m.status = ""

	case "tab":
		i := slices.Index(statsRanges, m.stats.days)
		return m.openStats(statsRanges[(i+1)%len(statsRanges)], false)
	case "r":
		return m.openStats(m.stats.days, true)

	case "j", "down":
		m.stats.cursor++
	case "k", "up":
		m.stats.cursor--
	case "pgdown", "ctrl+d":
		m.stats.cursor += h
	case "pgup", "ctrl+u":
		m.stats.cursor -= h
	case "g", "home":
		m.stats.cursor = 0
	case "G", "end":
		m.stats.cursor = len(m.stats.data.senders)

	case "u":
		if m.stats.cursor < len(m.stats.data.senders) {
			s := m.stats.data.senders[m.stats.cursor]
			return m, openUnsubscribe(s.name, s.unsubscribe)
		}
	}
	m.stats.scroll(h)
	return m, nil
}

// --- VIEW ---
func (m model) viewStats() string {
	s := m.stats
	var b strings.Builder

	end, _ := time.ParseInLocation(time.DateOnly, s.key.end, time.Local)
	title := fmt.Sprintf("Senders · %d days to %s", s.days, end.Format("Mon, 02 Jan"))
	meta := fmt.Sprintf("  %s · %s · %s", s.key.scope, plural(s.data.total), count(len(s.data.senders), "sender"))
	b.WriteString(ansi.Truncate(titleStyle.Render(title)+dimStyle.Render(meta), m.width, "…") + "\n\n")
	b.WriteString(dimStyle.Render(ansi.Truncate(fmt.Sprintf(" %5s %6s  %-10s  %-6s  %s", "mails", "unread", "share", "last", "sender"), m.width, "…")) + "\n")

	h := m.statsHeight()
	switch {
	case s.loading:
		b.WriteString(" Loading senders… (large ranges take a while)\n")
		h--
	case s.err != nil:
		b.WriteString(" " + errorStyle.Render("Error: "+s.err.Error()) + "\n")
		h--
	case len(s.data.senders) == 0:
		b.WriteString(dimStyle.Render(" No mail in this range.") + "\n")
		h--
	}

	top := 1
	if len(s.data.senders) > 0 {
		top = s.data.senders[0].count
	}
	last := min(s.offset+h, len(s.data.senders))
	for i := s.offset; i < last; i++ {
		b.WriteString(m.renderSender(s.data.senders[i], top, i == s.cursor) + "\n")
	}
	b.WriteString(strings.Repeat("\n", max(0, h-(last-s.offset))))

	status := m.status
	switch {
	case status != "":
	case s.data.truncated:
		status = errorStyle.Render(fmt.Sprintf("Only the newest %d mails were counted.", maxPerRange))
	case s.data.failed > 0:
		status = errorStyle.Render(fmt.Sprintf("%d mails failed to load (r to retry)", s.data.failed))
	}
	m.status = status
	b.WriteString(m.footerStatus())
	b.WriteString(m.help("j/k move · u unsubscribe · tab 7/30/90 days · r refresh · q back"))
	return b.String()
}

func (m model) renderSender(s senderStat, top int, selected bool) string {
	bar := strings.Repeat("█", max(1, s.count*10/top))
	unread := ""
	if s.unread > 0 {
		unread = fmt.Sprint(s.unread)
	}
	unsub := ""
	if s.unsubscribe != "" {
		unsub = "  [u]nsubscribe"
	}
	cols := fmt.Sprintf(" %5d %6s  %-10s  %-6s  ", s.count, unread, bar, s.last.Format("Jan 02"))
	if selected {
		line := cols + s.name + " <" + s.addr + ">" + unsub
		return selectedStyle.Width(m.width).Render(ansi.Truncate(line, m.width, "…"))
	}
	return ansi.Truncate(cols+senderStyle.Render(s.name)+dimStyle.Render(" <"+s.addr+">"+unsub), m.width, "…")
}

// --- COMMANDS ---
func fetchStats(srv *gmail.Service, day time.Time, days int, s scope, key statsKey) tea.Cmd {
	return func() tea.Msg {
		emails, failed, truncated, err := loadRange(srv, day.AddDate(0, 0, -(days-1)), day.AddDate(0, 0, 1), s, maxPerRange)
		return statsLoadedMsg{key: key, emails: emails, failed: failed, truncated: truncated, err: err}
	}
}
