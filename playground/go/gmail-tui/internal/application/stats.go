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

// statsLengths are the range lengths in days that tab cycles through.
var statsLengths = []int{7, 30, 90}

const maxRangeDays = 366

// --- MODEL ---
type statsKey struct {
	from, to string // inclusive days, YYYY-MM-DD
	scope    scope
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
	from, to time.Time // inclusive range of local days
	key      statsKey
	data     statsData
	loading  bool
	err      error
	cursor   int
	offset   int
}

// days is the length of the range in days.
func (s stats) days() int {
	return int(s.to.Sub(s.from).Hours()/24+0.5) + 1
}

type statsLoadedMsg struct {
	key       statsKey
	from, to  time.Time
	emails    []email
	failed    int
	truncated bool
	err       error
}

// rangeInput is the custom range dialog.
type rangeInput struct {
	fields [2]string // from, to as YYYY-MM-DD
	focus  int
	err    string
}

// openStats shows sender counts for the days from..to. Ranges whose days are
// all cached are counted locally; others are fetched once.
func (m model) openStats(from, to time.Time, refresh bool) (tea.Model, tea.Cmd) {
	m.mode = modeStats
	m.status = ""
	key := statsKey{from: dayKey(from), to: dayKey(to), scope: m.scope}
	m.stats = stats{from: from, to: to, key: key}
	if !refresh {
		if es, ok := m.cachedRange(from, to, m.scope); ok {
			m.stats.data = statsData{senders: summarize(es), total: len(es)}
			return m, nil
		}
		if d, ok := m.statsCache[key]; ok {
			m.stats.data = d
			return m, nil
		}
	}
	m.stats.loading = true
	return m, fetchStats(m.service, from, to, m.scope, key)
}

// cachedRange returns the mails of from..to in scope if every day is cached completely.
func (m model) cachedRange(from, to time.Time, s scope) ([]email, bool) {
	var es []email
	for d := from; !d.After(to); d = d.AddDate(0, 0, 1) {
		store, ok := m.days[dayKey(d)]
		if !ok || store.Failed > 0 {
			return nil, false
		}
		for _, e := range store.Emails {
			if s.match(e) {
				es = append(es, e)
			}
		}
	}
	return es, true
}

func (m model) statsLoaded(msg statsLoadedMsg) (tea.Model, tea.Cmd) {
	var d statsData
	var save tea.Cmd
	if msg.err == nil {
		d = statsData{senders: summarize(msg.emails), total: len(msg.emails), failed: msg.failed, truncated: msg.truncated}
		m.statsCache[msg.key] = d
		if m.fillDays(msg) {
			save = m.saveCache()
		}
	}
	if msg.key == m.stats.key {
		m.stats.loading = false
		m.stats.err = msg.err
		m.stats.data = d
		m.stats.scroll(m.statsHeight())
	}
	return m, save
}

// fillDays stores a complete "all received" range fetch as cached days, so
// browsing those days later needs no fetch. Days already cached are kept, as
// the sync keeps them current.
func (m *model) fillDays(msg statsLoadedMsg) bool {
	if msg.key.scope != scopeReceived || msg.truncated || msg.failed > 0 || m.historyID == 0 {
		return false
	}
	byDay := map[string][]email{}
	for _, e := range msg.emails {
		k := dayKey(e.Time)
		byDay[k] = append(byDay[k], e)
	}
	filled := false
	for d := msg.from; !d.After(msg.to); d = d.AddDate(0, 0, 1) {
		k := dayKey(d)
		if _, ok := m.days[k]; ok {
			continue
		}
		es := byDay[k]
		slices.SortStableFunc(es, func(a, b email) int { return b.Time.Compare(a.Time) })
		m.days[k] = dayStore{Emails: es}
		filled = true
	}
	return filled
}

// shiftStats moves the range by its own length; it never ends after today.
func (m model) shiftStats(dir int) (tea.Model, tea.Cmd) {
	n := m.stats.days()
	from, to := m.stats.from.AddDate(0, 0, dir*n), m.stats.to.AddDate(0, 0, dir*n)
	if to.After(today()) {
		from, to = today().AddDate(0, 0, -(n-1)), today()
	}
	return m.openStats(from, to, false)
}

// cycleStatsLength switches to the next preset length, keeping the end day.
func (m model) cycleStatsLength() (tea.Model, tea.Cmd) {
	n := statsLengths[0]
	for _, l := range statsLengths {
		if l > m.stats.days() {
			n = l
			break
		}
	}
	return m.openStats(m.stats.to.AddDate(0, 0, -(n-1)), m.stats.to, false)
}

// parseRange validates the custom range dialog.
func parseRange(in rangeInput) (from, to time.Time, err error) {
	from, err = time.ParseInLocation(time.DateOnly, strings.TrimSpace(in.fields[0]), time.Local)
	if err != nil {
		return from, to, fmt.Errorf("From is not a YYYY-MM-DD date")
	}
	to, err = time.ParseInLocation(time.DateOnly, strings.TrimSpace(in.fields[1]), time.Local)
	if err != nil {
		return from, to, fmt.Errorf("To is not a YYYY-MM-DD date")
	}
	switch {
	case from.After(to):
		return from, to, fmt.Errorf("From is after To")
	case to.After(today()):
		return from, to, fmt.Errorf("To is in the future")
	case to.Sub(from).Hours()/24 >= maxRangeDays:
		return from, to, fmt.Errorf("range is longer than %d days", maxRangeDays)
	}
	return from, to, nil
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

	// Range
	case "h", "left":
		return m.shiftStats(-1)
	case "l", "right":
		if m.stats.to.Before(today()) {
			return m.shiftStats(1)
		}
	case "t":
		n := m.stats.days()
		return m.openStats(today().AddDate(0, 0, -(n-1)), today(), false)
	case "tab":
		return m.cycleStatsLength()
	case "c":
		m.modal = modalRange
		m.rangeIn = rangeInput{fields: [2]string{dayKey(m.stats.from), dayKey(m.stats.to)}}
	case "r":
		return m.openStats(m.stats.from, m.stats.to, true)

	// List
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

func (m model) updateRange(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	in := &m.rangeIn
	switch k := msg.String(); k {
	case "esc":
		m.modal = modalNone
	case "tab", "shift+tab", "up", "down":
		in.focus = 1 - in.focus
	case "backspace":
		if f := in.fields[in.focus]; f != "" {
			in.fields[in.focus] = f[:len(f)-1]
		}
	case "enter":
		from, to, err := parseRange(*in)
		if err != nil {
			in.err = err.Error()
			return m, nil
		}
		m.modal = modalNone
		return m.openStats(from, to, false)
	default:
		if len(k) == 1 && strings.ContainsAny(k, "0123456789-") && len(in.fields[in.focus]) < len(time.DateOnly) {
			in.fields[in.focus] += k
			in.err = ""
		}
	}
	return m, nil
}

func (m model) viewRange() string {
	in := m.rangeIn
	lines := []string{titleStyle.Render("Sender range"), ""}
	for i, name := range []string{"From", "To  "} {
		field := pad(in.fields[i], len(time.DateOnly))
		if i == in.focus {
			field = selectedStyle.Render(field + "▏")
		} else {
			field += " "
		}
		lines = append(lines, name+"  "+field)
	}
	lines = append(lines, "")
	if in.err != "" {
		lines = append(lines, errorStyle.Render(in.err), "")
	}
	lines = append(lines, m.keyLine(keyHelp{"tab", "switch"}, keyHelp{"enter", "apply"}, keyHelp{"esc", "cancel"}))
	return strings.Join(lines, "\n")
}

// --- VIEW ---
func (m model) viewStats() string {
	s := m.stats
	var b strings.Builder

	title := "Senders · " + formatRange(s.from, s.to) + " · " + count(s.days(), "day")
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
	b.WriteString(m.helpBar(keyHelp{"?", "help"}, keyHelp{"q", "back"}, keyHelp{"h/l", "range"},
		keyHelp{"tab", "length"}, keyHelp{"c", "custom range"}, keyHelp{"u", "unsubscribe"}))
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

// formatRange renders a day range, e.g. "24 Oct – 30 Oct 2026".
func formatRange(from, to time.Time) string {
	if from.Year() == to.Year() {
		return from.Format("02 Jan") + " – " + to.Format("02 Jan 2006")
	}
	return from.Format("02 Jan 2006") + " – " + to.Format("02 Jan 2006")
}

// --- COMMANDS ---
func fetchStats(srv *gmail.Service, from, to time.Time, s scope, key statsKey) tea.Cmd {
	return func() tea.Msg {
		emails, failed, truncated, err := loadRange(srv, from, to.AddDate(0, 0, 1), s, maxPerRange)
		return statsLoadedMsg{key: key, from: from, to: to, emails: emails, failed: failed, truncated: truncated, err: err}
	}
}
