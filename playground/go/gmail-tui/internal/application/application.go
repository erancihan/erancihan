package application

import (
	"fmt"
	"strings"
	"time"

	"gmail-tui/internal/browser"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
	"google.golang.org/api/gmail/v1"
)

// --- STYLING ---
var (
	titleStyle    = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("229"))
	dimStyle      = lipgloss.NewStyle().Foreground(lipgloss.Color("240"))
	senderStyle   = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("111"))
	unreadStyle   = lipgloss.NewStyle().Bold(true)
	selectedStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("229")).Background(lipgloss.Color("57"))
	errorStyle    = lipgloss.NewStyle().Foreground(lipgloss.Color("203"))
)

const unreadMark = "●"

// --- MODEL ---
type mode int

const (
	modeDay mode = iota
	modeReader
	modeStats
)

type cacheKey struct {
	day   string // YYYY-MM-DD
	scope scope
}

type dayData struct {
	groups []group
	total  int
	failed int
}

// row is one line of the day list: a sender header (mail == -1) or a mail inside a group.
type row struct {
	group int
	mail  int
}

type model struct {
	service *gmail.Service
	mode    mode
	width   int
	height  int
	status  string

	// day view
	day       time.Time // local midnight
	scope     scope
	cache     map[cacheKey]dayData
	data      dayData
	collapsed map[string]bool // sender address -> folded; kept across days
	rows      []row
	cursor    int
	offset    int
	loading   bool

	reader     reader
	bodies     map[string]*message // message id -> loaded mail
	stats      stats
	statsCache map[statsKey]statsData
}

// --- CONSTRUCTOR ---
func NewApplication(srv *gmail.Service) model {
	return model{
		service:    srv,
		day:        today(),
		scope:      scopeReceived,
		cache:      map[cacheKey]dayData{},
		collapsed:  map[string]bool{},
		bodies:     map[string]*message{},
		statsCache: map[statsKey]statsData{},
		stats:      stats{days: statsRanges[0]},
		width:      80,
		height:     24,
		loading:    true,
	}
}

func today() time.Time {
	y, mo, d := time.Now().Date()
	return time.Date(y, mo, d, 0, 0, 0, 0, time.Local)
}

func (m model) key() cacheKey {
	return cacheKey{day: m.day.Format(time.DateOnly), scope: m.scope}
}

// --- MESSAGES ---
type dayLoadedMsg struct {
	key    cacheKey
	emails []email
	failed int
	err    error
}

type statusMsg string

// --- INIT ---
func (m model) Init() tea.Cmd {
	return fetchDay(m.service, m.day, m.scope)
}

// --- UPDATE ---
func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {

	case tea.WindowSizeMsg:
		m.width, m.height = msg.Width, msg.Height
		m.scroll()
		m.reader.layout(m.width, m.readerHeight())
		m.stats.scroll(m.statsHeight())

	case tea.KeyMsg:
		if msg.String() == "ctrl+c" {
			return m, tea.Quit
		}
		switch m.mode {
		case modeReader:
			return m.updateReader(msg)
		case modeStats:
			return m.updateStats(msg)
		}
		return m.updateDay(msg)

	case statusMsg:
		m.status = string(msg)

	case dayLoadedMsg:
		if msg.err != nil {
			if msg.key == m.key() {
				m.loading = false
				m.status = errorStyle.Render("Error: " + msg.err.Error())
			}
			return m, nil
		}
		d := dayData{groups: groupBySender(msg.emails), total: len(msg.emails), failed: msg.failed}
		m.cache[msg.key] = d
		if msg.key == m.key() {
			m.loading = false
			m.show(d)
		}

	case messageLoadedMsg:
		return m.messageLoaded(msg)

	case statsLoadedMsg:
		return m.statsLoaded(msg)
	}

	return m, nil
}

func (m model) updateDay(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "q":
		return m, tea.Quit

	// Day navigation
	case "h", "left":
		return m.open(m.day.AddDate(0, 0, -1), m.scope, false)
	case "l", "right":
		if m.day.Before(today()) {
			return m.open(m.day.AddDate(0, 0, 1), m.scope, false)
		}
	case "t":
		return m.open(today(), m.scope, false)
	case "r":
		return m.open(m.day, m.scope, true)

	// Toggle between all received mail and inbox only
	case "tab":
		return m.open(m.day, 1-m.scope, false)

	// List movement
	case "j", "down":
		m.move(1)
	case "k", "up":
		m.move(-1)
	case "pgdown", "ctrl+d":
		m.move(m.listHeight())
	case "pgup", "ctrl+u":
		m.move(-m.listHeight())
	case "g", "home":
		m.move(-len(m.rows))
	case "G", "end":
		m.move(len(m.rows))

	// Read a mail, or fold its sender
	case "enter":
		if e, ok := m.selectedEmail(); ok {
			return m.openReader(e)
		}
		m.toggleFold()
	case " ":
		m.toggleFold()
	case "z":
		fold := false
		for _, g := range m.data.groups {
			if !m.collapsed[g.key] {
				fold = true
				break
			}
		}
		for _, g := range m.data.groups {
			m.collapsed[g.key] = fold
		}
		m.rebuild()

	// Links
	case "u":
		if g, ok := m.selectedGroup(); ok {
			return m, openUnsubscribe(g.name, g.unsubscribe())
		}
	case "o":
		if e, ok := m.selectedEmail(); ok {
			return m, openLink(gmailLink(e.ID))
		}

	// Sender stats
	case "s":
		return m.openStats(m.stats.days, false)
	}
	return m, nil
}

// open switches to the given day and scope, loading it unless cached.
func (m model) open(day time.Time, s scope, refresh bool) (tea.Model, tea.Cmd) {
	m.day, m.scope = day, s
	m.cursor, m.offset = 0, 0
	if d, ok := m.cache[m.key()]; ok && !refresh {
		m.loading = false
		m.show(d)
		return m, nil
	}
	m.loading = true
	m.show(dayData{})
	return m, fetchDay(m.service, day, s)
}

func (m *model) show(d dayData) {
	m.data = d
	m.status = ""
	if d.failed > 0 {
		m.status = errorStyle.Render(fmt.Sprintf("%d mails failed to load (r to retry)", d.failed))
	}
	m.rebuild()
}

// rebuild recomputes the visible rows from the groups and fold state.
func (m *model) rebuild() {
	m.rows = nil
	for gi, g := range m.data.groups {
		m.rows = append(m.rows, row{group: gi, mail: -1})
		if m.collapsed[g.key] {
			continue
		}
		for ei := range g.emails {
			m.rows = append(m.rows, row{group: gi, mail: ei})
		}
	}
	m.move(0)
}

func (m *model) toggleFold() {
	g, ok := m.selectedGroup()
	if !ok {
		return
	}
	m.collapsed[g.key] = !m.collapsed[g.key]
	m.rebuild()
	// keep the cursor on the group header after folding
	for i, r := range m.rows {
		if r.mail < 0 && m.data.groups[r.group].key == g.key {
			m.cursor = i
			break
		}
	}
	m.scroll()
}

func (m model) selectedGroup() (group, bool) {
	if m.cursor >= len(m.rows) {
		return group{}, false
	}
	return m.data.groups[m.rows[m.cursor].group], true
}

func (m model) selectedEmail() (email, bool) {
	if m.cursor >= len(m.rows) || m.rows[m.cursor].mail < 0 {
		return email{}, false
	}
	r := m.rows[m.cursor]
	return m.data.groups[r.group].emails[r.mail], true
}

// stepEmail moves the cursor to the next (dir=1) or previous (dir=-1) mail row.
func (m *model) stepEmail(dir int) bool {
	for i := m.cursor + dir; i >= 0 && i < len(m.rows); i += dir {
		if m.rows[i].mail >= 0 {
			m.cursor = i
			m.scroll()
			return true
		}
	}
	return false
}

func (m *model) move(delta int) {
	m.cursor = max(0, min(m.cursor+delta, len(m.rows)-1))
	m.scroll()
}

func (m *model) scroll() {
	h := m.listHeight()
	if m.cursor < m.offset {
		m.offset = m.cursor
	}
	if m.cursor >= m.offset+h {
		m.offset = m.cursor - h + 1
	}
	m.offset = max(0, min(m.offset, len(m.rows)-h))
}

// listHeight is the screen height minus title, blank line, status and help.
func (m model) listHeight() int {
	return max(1, m.height-4)
}

// --- VIEW ---
func (m model) View() string {
	switch m.mode {
	case modeReader:
		return m.viewReader()
	case modeStats:
		return m.viewStats()
	}
	return m.viewDay()
}

func (m model) viewDay() string {
	var b strings.Builder

	title := "◂ " + m.day.Format("Mon, 02 Jan 2006") + " ▸"
	if m.day.Equal(today()) {
		title += " (today)"
	}
	meta := fmt.Sprintf("  %s · %d mails · %d senders", m.scope, m.data.total, len(m.data.groups))
	b.WriteString(ansi.Truncate(titleStyle.Render(title)+dimStyle.Render(meta), m.width, "…") + "\n\n")

	h := m.listHeight()
	switch {
	case len(m.rows) == 0 && m.loading:
		b.WriteString(" Loading…\n")
		h--
	case len(m.rows) == 0:
		b.WriteString(dimStyle.Render(" No mail on this day.") + "\n")
		h--
	}
	end := min(m.offset+h, len(m.rows))
	for i := m.offset; i < end; i++ {
		b.WriteString(m.renderRow(m.rows[i], i == m.cursor) + "\n")
	}
	b.WriteString(strings.Repeat("\n", max(0, h-(end-m.offset))))

	if m.loading {
		b.WriteString(" Loading " + m.scope.String() + "…\n")
	} else {
		b.WriteString(m.footerStatus())
	}
	b.WriteString(m.help("h/l day · t today · enter read · space/z fold · s senders · u unsub · o web · tab scope · r refresh · q quit"))
	return b.String()
}

func (m model) footerStatus() string {
	if m.status == "" {
		return "\n"
	}
	return " " + ansi.Truncate(m.status, m.width-1, "…") + "\n"
}

func (m model) help(text string) string {
	return dimStyle.Render(ansi.Truncate(" "+text, m.width, "…"))
}

func (m model) renderRow(r row, selected bool) string {
	g := m.data.groups[r.group]

	if r.mail < 0 {
		arrow := "▾"
		if m.collapsed[g.key] {
			arrow = "▸"
		}
		count := fmt.Sprintf(" (%d)", len(g.emails))
		if selected {
			return selectedStyle.Width(m.width).Render(ansi.Truncate(arrow+" "+g.name+count, m.width, "…"))
		}
		return ansi.Truncate(arrow+" "+senderStyle.Render(g.name)+dimStyle.Render(count), m.width, "…")
	}

	e := g.emails[r.mail]
	mark := " "
	if e.Unread {
		mark = unreadMark
	}
	prefix := "   " + e.Time.Format("15:04") + " " + mark + " "
	if selected {
		line := prefix + e.Subject + " — " + e.Snippet
		return selectedStyle.Width(m.width).Render(ansi.Truncate(line, m.width, "…"))
	}
	subject := e.Subject
	if e.Unread {
		subject = unreadStyle.Render(subject)
	}
	return ansi.Truncate(prefix+subject+dimStyle.Render(" — "+e.Snippet), m.width, "…")
}

// --- COMMANDS ---
func fetchDay(srv *gmail.Service, day time.Time, s scope) tea.Cmd {
	key := cacheKey{day: day.Format(time.DateOnly), scope: s}
	return func() tea.Msg {
		emails, failed, err := loadDay(srv, day, s)
		return dayLoadedMsg{key: key, emails: emails, failed: failed, err: err}
	}
}

func gmailLink(id string) string {
	return "https://mail.google.com/mail/u/0/#all/" + id
}

// openLink opens url in the browser, reporting the url in the status line if that fails.
func openLink(url string) tea.Cmd {
	return func() tea.Msg {
		if err := browser.Open(url); err != nil {
			return statusMsg("Could not open browser. Link: " + url)
		}
		return statusMsg("Opened " + url)
	}
}

// openUnsubscribe opens a web opt-out link; mailto links are only shown.
func openUnsubscribe(sender, link string) tea.Cmd {
	switch {
	case link == "":
		return func() tea.Msg { return statusMsg("No unsubscribe link from " + sender) }
	case strings.HasPrefix(link, "mailto:"):
		return func() tea.Msg { return statusMsg("Unsubscribe by mail: " + strings.TrimPrefix(link, "mailto:")) }
	}
	return openLink(link)
}
