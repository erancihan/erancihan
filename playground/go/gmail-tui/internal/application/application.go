package application

import (
	"fmt"
	"slices"
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
	checkStyle    = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("78"))
	labelStyle    = lipgloss.NewStyle().Foreground(lipgloss.Color("180"))
	modalStyle    = lipgloss.NewStyle().Border(lipgloss.RoundedBorder()).BorderForeground(lipgloss.Color("62")).Padding(0, 1)
)

const (
	unreadMark  = "●"
	checkMark   = "✓"
	senderWidth = 18 // sender column in the flat list
)

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
	emails []email // newest first
	groups []group
	failed int
}

func newDayData(emails []email, failed int) dayData {
	slices.SortStableFunc(emails, func(a, b email) int { return b.Time.Compare(a.Time) })
	return dayData{emails: emails, groups: groupBySender(emails), failed: failed}
}

// row is one line of the day list. In the flat list group is -1 and mail
// indexes dayData.emails; in the grouped list mail is -1 for a sender header
// and otherwise indexes the group's mails.
type row struct {
	group int
	mail  int
}

type model struct {
	service      *gmail.Service
	settings     Settings
	settingsPath string
	mode         mode
	width        int
	height       int
	status       string

	// day view
	day       time.Time // local midnight
	scope     scope
	cache     map[cacheKey]dayData
	data      dayData
	collapsed map[string]bool // sender address -> folded; kept across days
	selected  map[string]bool // message id -> selected for bulk actions
	rows      []row
	cursor    int
	offset    int
	loading   bool

	reader     reader
	bodies     map[string]*message // message id -> loaded mail
	stats      stats
	statsCache map[statsKey]statsData

	modal          modal
	settingsCursor int
	confirm        confirmState
	picker         labelPicker
	labels         []label // nil until loaded
	labelsErr      error
}

// --- CONSTRUCTOR ---
func NewApplication(srv *gmail.Service, settings Settings, settingsPath string) model {
	return model{
		service:      srv,
		settings:     settings,
		settingsPath: settingsPath,
		day:          today(),
		scope:        scopeReceived,
		cache:        map[cacheKey]dayData{},
		collapsed:    map[string]bool{},
		selected:     map[string]bool{},
		bodies:       map[string]*message{},
		statsCache:   map[statsKey]statsData{},
		stats:        stats{days: statsRanges[0]},
		width:        80,
		height:       24,
		loading:      true,
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
	return tea.Batch(fetchDay(m.service, m.day, m.scope), fetchLabels(m.service))
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
		if m.modal != modalNone {
			return m.updateModal(msg)
		}
		switch msg.String() {
		case ",":
			m.modal = modalSettings
			return m, nil
		case "?":
			m.modal = modalHelp
			return m, nil
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
		d := newDayData(msg.emails, msg.failed)
		m.cache[msg.key] = d
		if msg.key == m.key() {
			m.loading = false
			m.show(d)
		}

	case labelsLoadedMsg:
		m.labels, m.labelsErr = msg.labels, msg.err

	case actionDoneMsg:
		return m.actionDone(msg)

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

	// Selection and bulk actions
	case "x":
		m.toggleSelect()
		m.move(1)
	case "A":
		m.toggleSelectAll()
	case "esc":
		clear(m.selected)
	case "d":
		return m.confirmTrash(m.targets()), nil
	case "m":
		return m, m.toggleRead(m.targets())
	case "L":
		return m.openLabels(m.targets())

	// Links
	case "u":
		name, link := m.currentUnsubscribe()
		if name != "" {
			return m, openUnsubscribe(name, link)
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
	clear(m.selected)
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

// rebuild recomputes the visible rows from the mails, grouping and fold state.
func (m *model) rebuild() {
	m.rows = nil
	if !m.settings.GroupBySender {
		for i := range m.data.emails {
			m.rows = append(m.rows, row{group: -1, mail: i})
		}
		m.move(0)
		return
	}
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

// cursorTo puts the cursor on the row of the given mail, if it is visible.
func (m *model) cursorTo(id string) {
	for i, r := range m.rows {
		if e, ok := m.rowEmail(r); ok && e.ID == id {
			m.cursor = i
			break
		}
	}
	m.scroll()
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

// selectedGroup returns the sender group under the cursor (grouped list only).
func (m model) selectedGroup() (group, bool) {
	if m.cursor >= len(m.rows) || m.rows[m.cursor].group < 0 {
		return group{}, false
	}
	return m.data.groups[m.rows[m.cursor].group], true
}

func (m model) selectedEmail() (email, bool) {
	if m.cursor >= len(m.rows) {
		return email{}, false
	}
	return m.rowEmail(m.rows[m.cursor])
}

func (m model) rowEmail(r row) (email, bool) {
	switch {
	case r.group < 0:
		return m.data.emails[r.mail], true
	case r.mail < 0:
		return email{}, false
	}
	return m.data.groups[r.group].emails[r.mail], true
}

// currentUnsubscribe returns the sender and opt-out link for the cursor row.
func (m model) currentUnsubscribe() (name, link string) {
	addr := ""
	if e, ok := m.selectedEmail(); ok {
		name, addr = e.FromName, e.FromAddr
	} else if g, ok := m.selectedGroup(); ok {
		name, addr = g.name, g.key
	}
	for _, g := range m.data.groups {
		if g.key == addr {
			return name, g.unsubscribe()
		}
	}
	return name, ""
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
	var v string
	switch m.mode {
	case modeReader:
		v = m.viewReader()
	case modeStats:
		v = m.viewStats()
	default:
		v = m.viewDay()
	}
	if m.modal != modalNone {
		v = overlay(v, m.viewModal(), m.width, m.height)
	}
	return v
}

// overlay draws box centered on top of base.
func overlay(base, box string, width, height int) string {
	lines := strings.Split(base, "\n")
	for len(lines) < height {
		lines = append(lines, "")
	}
	boxLines := strings.Split(box, "\n")
	bw := lipgloss.Width(box)
	x := max(0, (width-bw)/2)
	y := max(0, (len(lines)-len(boxLines))/2)
	for i, bl := range boxLines {
		if y+i >= len(lines) {
			break
		}
		l := lines[y+i]
		left := ansi.Truncate(l, x, "")
		left += strings.Repeat(" ", max(0, x-ansi.StringWidth(left)))
		lines[y+i] = left + bl + ansi.TruncateLeft(l, x+bw, "")
	}
	return strings.Join(lines, "\n")
}

func (m model) viewDay() string {
	var b strings.Builder

	title := "◂ " + m.day.Format("Mon, 02 Jan 2006") + " ▸"
	if m.day.Equal(today()) {
		title += " (today)"
	}
	meta := fmt.Sprintf("  %s · %d mails · %d senders", m.scope, len(m.data.emails), len(m.data.groups))
	if n := len(m.selected); n > 0 {
		meta += fmt.Sprintf(" · %d selected", n)
	}
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
	b.WriteString(m.help("? keys · h/l day · enter read · x select · d trash · m read · L label · s senders · , settings · q quit"))
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

// check renders the selection column.
func (m model) check(selected bool, cursor bool) string {
	switch {
	case !selected:
		return " "
	case cursor:
		return checkMark
	}
	return checkStyle.Render(checkMark)
}

func (m model) renderRow(r row, cursor bool) string {
	if r.group >= 0 && r.mail < 0 {
		g := m.data.groups[r.group]
		all := true
		for _, e := range g.emails {
			all = all && m.selected[e.ID]
		}
		arrow := "▾"
		if m.collapsed[g.key] {
			arrow = "▸"
		}
		count := fmt.Sprintf(" (%d)", len(g.emails))
		if cursor {
			return selectedStyle.Width(m.width).Render(ansi.Truncate(m.check(all, true)+arrow+" "+g.name+count, m.width, "…"))
		}
		return ansi.Truncate(m.check(all, false)+arrow+" "+senderStyle.Render(g.name)+dimStyle.Render(count), m.width, "…")
	}

	e, _ := m.rowEmail(r)
	mark := " "
	if e.Unread {
		mark = unreadMark
	}
	indent := " "
	if r.group >= 0 {
		indent = "   "
	}
	prefix := indent + e.Time.Format("15:04") + " " + mark + " "
	sender := ""
	if r.group < 0 {
		sender = ansi.Truncate(e.FromName, senderWidth, "…")
		sender += strings.Repeat(" ", senderWidth-ansi.StringWidth(sender)) + "  "
	}
	chips := m.labelChips(e)
	snippet := ""
	if e.Snippet != "" {
		snippet = " — " + e.Snippet
	}

	if cursor {
		line := m.check(m.selected[e.ID], true) + prefix + sender + e.Subject + chips + snippet
		return selectedStyle.Width(m.width).Render(ansi.Truncate(line, m.width, "…"))
	}
	subject := e.Subject
	if e.Unread {
		subject = unreadStyle.Render(subject)
	}
	if sender != "" {
		sender = senderStyle.Render(sender)
	}
	return ansi.Truncate(m.check(m.selected[e.ID], false)+prefix+sender+subject+labelStyle.Render(chips)+dimStyle.Render(snippet), m.width, "…")
}

// labelChips lists a mail's star and user labels, e.g. " ★ [Work]".
func (m model) labelChips(e email) string {
	var b strings.Builder
	if slices.Contains(e.Labels, "STARRED") {
		b.WriteString(" ★")
	}
	for _, l := range m.labels {
		if !strings.HasPrefix(l.ID, "Label_") {
			continue // system label
		}
		if slices.Contains(e.Labels, l.ID) {
			b.WriteString(" [" + l.Name + "]")
		}
	}
	return b.String()
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
