package application

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
	"google.golang.org/api/gmail/v1"
)

const calCell = 8 // width of a calendar day cell

var (
	todayStyle  = lipgloss.NewStyle().Bold(true).Underline(true).Foreground(lipgloss.Color("229"))
	shownStyle  = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("78"))
	futureStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("237"))
)

// --- MODEL ---
type calendar struct {
	month  time.Time // first day of the shown month
	cursor time.Time // highlighted day
}

// dayCount is the number of mails of a day in one scope.
type dayCount struct {
	total, unread int
}

type countKey struct {
	day   string
	scope scope
}

type countsMsg struct {
	scope  scope
	counts map[string]dayCount
	failed []string // days whose counts could not be read
}

func firstOfMonth(d time.Time) time.Time {
	return time.Date(d.Year(), d.Month(), 1, 0, 0, 0, 0, time.Local)
}

func (m model) openCalendar() (tea.Model, tea.Cmd) {
	m.modal = modalCalendar
	m.cal = calendar{month: firstOfMonth(m.day), cursor: m.day}
	return m, m.loadCounts(false)
}

// dayCount returns the counts of a day in the current scope: from the day
// cache when the day is cached, else from fetched counts.
func (m model) dayCount(day time.Time) (dayCount, bool) {
	if s, ok := m.days[dayKey(day)]; ok && s.Failed == 0 {
		var c dayCount
		for _, e := range m.dayMails(dayKey(day)) {
			if m.scope.match(e) {
				c.total++
				if e.Unread {
					c.unread++
				}
			}
		}
		return c, true
	}
	c, ok := m.counts[countKey{dayKey(day), m.scope}]
	return c, ok
}

// loadCounts fetches counts for the shown month's past days that are neither
// cached nor counted yet; refresh counts them all again.
func (m *model) loadCounts(refresh bool) tea.Cmd {
	var days []time.Time
	end := m.cal.month.AddDate(0, 1, 0)
	for d := m.cal.month; d.Before(end) && !d.After(today()); d = d.AddDate(0, 0, 1) {
		k := countKey{dayKey(d), m.scope}
		if _, ok := m.days[k.day]; ok && !refresh {
			continue
		}
		if _, ok := m.counts[k]; (ok && !refresh) || m.countPending[k] {
			continue
		}
		m.countPending[k] = true
		days = append(days, d)
	}
	if len(days) == 0 || m.service == nil {
		return nil
	}
	return fetchCounts(m.service, days, m.scope)
}

func (m model) countsLoaded(msg countsMsg) (tea.Model, tea.Cmd) {
	for d, c := range msg.counts {
		k := countKey{d, msg.scope}
		m.counts[k] = c
		delete(m.countPending, k)
	}
	for _, d := range msg.failed {
		delete(m.countPending, countKey{d, msg.scope})
	}
	if len(msg.failed) > 0 {
		m.status = errorStyle.Render(fmt.Sprintf("Could not count %s (r in calendar to retry)", count(len(msg.failed), "day")))
	}
	return m, nil
}

// --- UPDATE ---
func (m model) updateCalendar(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	c := m.cal.cursor
	switch msg.String() {
	case "esc", "q", "c":
		m.modal = modalNone
		return m, nil
	case "enter":
		m.modal = modalNone
		m.span = spanDay
		return m.open(m.cal.cursor, m.scope, false)
	case "r":
		return m, m.loadCounts(true)
	case "h", "left":
		c = c.AddDate(0, 0, -1)
	case "l", "right":
		c = c.AddDate(0, 0, 1)
	case "k", "up":
		c = c.AddDate(0, 0, -7)
	case "j", "down":
		c = c.AddDate(0, 0, 7)
	case "[", "pgup", "H":
		c = c.AddDate(0, -1, 0)
	case "]", "pgdown", "L":
		c = c.AddDate(0, 1, 0)
	case "t":
		c = today()
	default:
		return m, nil
	}
	if c.After(today()) {
		c = today()
	}
	m.cal.cursor = c
	m.cal.month = firstOfMonth(c)
	return m, m.loadCounts(false)
}

// --- VIEW ---
func (m model) viewCalendar() string {
	month := m.cal.month
	var b strings.Builder
	b.WriteString(titleStyle.Render(month.Format("January 2006")) + dimStyle.Render("  "+m.scope.String()) + "\n\n")
	for _, wd := range []string{"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"} {
		b.WriteString(dimStyle.Render(pad(" "+wd, calCell)))
	}
	b.WriteString("\n")

	lead := (int(month.Weekday()) + 6) % 7 // Monday first
	daysIn := month.AddDate(0, 1, -1).Day()
	weeks := (lead + daysIn + 6) / 7
	// a blank line between weeks, when the modal still fits: 8 lines of
	// chrome (border, title, header, legend, keys) plus 3 per week
	spaced := m.height >= 8+3*weeks-1
	for week := range weeks {
		if spaced && week > 0 {
			b.WriteString("\n")
		}
		var top, bottom strings.Builder
		for col := range 7 {
			n := week*7 + col - lead + 1
			if n < 1 || n > daysIn {
				top.WriteString(strings.Repeat(" ", calCell))
				bottom.WriteString(strings.Repeat(" ", calCell))
				continue
			}
			t, bt := m.calCell(month.AddDate(0, 0, n-1))
			top.WriteString(t)
			bottom.WriteString(bt)
		}
		b.WriteString(top.String() + "\n" + bottom.String() + "\n")
	}

	b.WriteString("\n" + dimStyle.Render("12 mails · ") + unreadStyle.Render("●3") + dimStyle.Render(" unread · · counting") + "\n")
	b.WriteString(m.keyLine(keyHelp{"h/l", "day"}, keyHelp{"j/k", "week"}, keyHelp{"[/]", "month"},
		keyHelp{"t", "today"}, keyHelp{"enter", "open"}, keyHelp{"esc", "close"}))
	return b.String()
}

// calCell renders a day as two lines: the day number and its counts.
func (m model) calCell(d time.Time) (top, bottom string) {
	num := fmt.Sprintf(" %2d", d.Day())
	counts := ""
	switch c, ok := m.dayCount(d); {
	case d.After(today()):
	case ok && c.total == 0:
		counts = dimStyle.Render(" 0")
	case ok:
		counts = fmt.Sprintf(" %d", c.total)
		if c.unread > 0 {
			counts += unreadStyle.Render(fmt.Sprintf(" ●%d", c.unread))
		}
	default:
		counts = dimStyle.Render(" ·")
	}

	switch {
	case d.After(today()):
		num = futureStyle.Render(num)
	case d.Equal(today()):
		num = " " + todayStyle.Render(fmt.Sprintf("%2d", d.Day()))
	case d.Equal(m.day):
		num = shownStyle.Render(num)
	}
	top, bottom = pad(num, calCell), pad(counts, calCell)
	if d.Equal(m.cal.cursor) {
		return selectedStyle.Render(ansi.Strip(top)), selectedStyle.Render(ansi.Strip(bottom))
	}
	return top, bottom
}

// --- COMMANDS ---

// fetchCounts counts each day's mails and unread mails with id-only list
// requests, without fetching any message.
func fetchCounts(srv *gmail.Service, days []time.Time, s scope) tea.Cmd {
	return func() tea.Msg {
		ctx := context.Background()
		msg := countsMsg{scope: s, counts: map[string]dayCount{}}
		var mu sync.Mutex
		jobs := make(chan time.Time)
		var wg sync.WaitGroup
		for range fetchWorkers {
			wg.Go(func() {
				for d := range jobs {
					q := fmt.Sprintf("after:%d before:%d %s", d.Unix(), d.AddDate(0, 0, 1).Unix(), s.query())
					total, err1 := listCount(ctx, srv, q)
					unread, err2 := listCount(ctx, srv, q+" is:unread")
					mu.Lock()
					if err1 != nil || err2 != nil {
						msg.failed = append(msg.failed, dayKey(d))
					} else {
						msg.counts[dayKey(d)] = dayCount{total: total, unread: unread}
					}
					mu.Unlock()
				}
			})
		}
		for _, d := range days {
			jobs <- d
		}
		close(jobs)
		wg.Wait()
		return msg
	}
}

// listCount returns how many messages match q.
func listCount(ctx context.Context, srv *gmail.Service, q string) (int, error) {
	n := 0
	err := srv.Users.Messages.List("me").Q(q).MaxResults(500).
		Fields("messages/id", "nextPageToken").
		Pages(ctx, func(r *gmail.ListMessagesResponse) error {
			n += len(r.Messages)
			return nil
		})
	return n, err
}
