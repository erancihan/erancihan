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
	archivedStyle = lipgloss.NewStyle().Faint(true)
	modalStyle    = lipgloss.NewStyle().Border(lipgloss.RoundedBorder()).BorderForeground(lipgloss.Color("62")).Padding(0, 1)
)

const (
	unreadMark  = "●"
	checkMark   = "✓"
	labelWidth  = 16 // labels column
	senderWidth = 18 // sender column in the flat list
	prefetchGap = 1  // days before the shown one to load in the background
	keepDays    = 60 // days kept in the disk cache
)

// --- MODEL ---
type mode int

const (
	modeDay mode = iota
	modeReader
	modeStats
)

// dayKey is the cache key of a day, YYYY-MM-DD.
func dayKey(day time.Time) string {
	return day.Format(time.DateOnly)
}

// dayData is the shown day: the cached mails filtered by scope.
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
	cachePath    string
	mode         mode
	width        int
	height       int
	status       string

	// mail list: one day, or all mail (see all.go)
	list        listKind
	all         allList
	listGen     int        // last all-mail query generation, across lists
	back        *savedList // list to restore when leaving a sender's mail
	day         time.Time  // local midnight
	scope       scope
	mails       map[string]email    // id -> the one stored copy of each mail; see store.go
	days        map[string]dayStore // day key -> ids of all received mail; see sync.go
	pending     map[string]bool     // day keys being fetched
	historyID   uint64              // Gmail history id the cache is current to
	syncing     bool
	inboxUnread int64 // unread mails in the inbox, all days; -1 until known
	data        dayData
	collapsed   map[string]bool // sender address -> folded; kept across days
	selected    map[string]bool // message id -> selected for bulk actions
	rows        []row
	cursor      int
	offset      int
	loading     bool

	reader     reader
	bodies     map[string]*message // message id -> loaded mail
	stats      stats
	statsCache map[statsKey]statsData

	modal          modal
	settingsCursor int
	confirm        confirmState
	rangeIn        rangeInput
	searchIn       string
	cal            calendar
	counts         map[countKey]dayCount // per-day counts of days that are not cached
	countPending   map[countKey]bool
	picker         labelPicker
	labels         []label // nil until loaded
	labelsErr      error
}

// Options configure the application.
type Options struct {
	Settings     Settings
	SettingsPath string // where settings are saved; empty disables saving
	CachePath    string // where fetched days are cached; empty disables the disk cache
}

// --- CONSTRUCTOR ---
func NewApplication(srv *gmail.Service, opts Options) model {
	m := model{
		service:      srv,
		settings:     opts.Settings,
		settingsPath: opts.SettingsPath,
		cachePath:    opts.CachePath,
		day:          today(),
		scope:        scopeReceived,
		mails:        map[string]email{},
		days:         map[string]dayStore{},
		pending:      map[string]bool{},
		counts:       map[countKey]dayCount{},
		countPending: map[countKey]bool{},
		collapsed:    map[string]bool{},
		selected:     map[string]bool{},
		bodies:       map[string]*message{},
		statsCache:   map[statsKey]statsData{},
		stats:        stats{from: today().AddDate(0, 0, -(statsLengths[0] - 1)), to: today()},
		inboxUnread:  -1,
		width:        80,
		height:       24,
	}
	if opts.Settings.RememberView && opts.Settings.View == scopeInbox.key() {
		m.scope = scopeInbox
	}
	if opts.CachePath != "" {
		m.mails, m.days, m.historyID = loadCache(opts.CachePath)
	}
	if _, ok := m.days[dayKey(m.day)]; !ok {
		m.pending[dayKey(m.day)] = true
		m.loading = true
	}
	m.refreshView()
	return m
}

func today() time.Time {
	y, mo, d := time.Now().Date()
	return time.Date(y, mo, d, 0, 0, 0, 0, time.Local)
}

// --- MESSAGES ---
type dayLoadedMsg struct {
	day       string
	emails    []email
	failed    int
	historyID uint64 // mailbox history id read before listing, if requested
	err       error
}

type statusMsg string

// --- INIT ---
func (m model) Init() tea.Cmd {
	cmds := []tea.Cmd{fetchLabels(m.service), fetchInboxUnread(m.service), syncTick()}
	if m.pending[dayKey(m.day)] {
		cmds = append(cmds, fetchDay(m.service, m.day, m.historyID == 0))
	}
	if m.historyID != 0 {
		// catch up on changes since the cache was saved
		cmds = append(cmds, func() tea.Msg { return syncTickMsg{} })
	}
	cmds = append(cmds, m.prefetch())
	return tea.Batch(cmds...)
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
		return m.dayLoaded(msg)

	case syncTickMsg:
		m, cmd := m.startSync()
		return m, tea.Batch(cmd, syncTick())

	case syncedMsg:
		return m.synced(msg)

	case allLoadedMsg:
		return m.allLoaded(msg)

	case statsIDsMsg:
		return m.statsIDs(msg)

	case statsChunkMsg:
		return m.statsChunkDone(msg)

	case countsMsg:
		return m.countsLoaded(msg)

	case inboxUnreadMsg:
		if msg.err == nil {
			m.inboxUnread = msg.n
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
	if m.list == listAll {
		if next, cmd, ok := m.updateAll(msg); ok {
			return next, cmd
		}
	}
	switch msg.String() {
	case "q":
		return m, tea.Quit
	case "a":
		return m.openAll(false)

	// Day navigation
	case "h", "left":
		return m.open(m.day.AddDate(0, 0, -1), m.scope, false)
	case "l", "right":
		if m.day.Before(today()) {
			return m.open(m.day.AddDate(0, 0, 1), m.scope, false)
		}
	case "t":
		return m.open(today(), m.scope, false)
	case "c":
		return m.openCalendar()
	case "r":
		return m.open(m.day, m.scope, true)

	// Toggle between all received mail and inbox only
	case "tab":
		next, cmd := m.open(m.day, 1-m.scope, false)
		nm := next.(model)
		nm.rememberView()
		return nm, cmd

	// List movement
	case "j", "down":
		m.move(1)
		return m, m.loadMoreIfNeeded()
	case "k", "up":
		m.move(-1)
	case "pgdown", "ctrl+d":
		m.move(m.listHeight())
		return m, m.loadMoreIfNeeded()
	case "pgup", "ctrl+u":
		m.move(-m.listHeight())
	case "g", "home":
		m.move(-len(m.rows))
	case "G", "end":
		m.move(len(m.rows))
		return m, m.loadMoreIfNeeded()

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
	case "X":
		clear(m.selected)
	case "e", "E", "d", "D", "m", "M", "v", "V", "L":
		act, shift, _ := actionKey(msg.String())
		return m.runAction(act, shift, m.cursorTargets())

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
		return m.openStats(m.stats.from, m.stats.to, false)
	}
	return m, nil
}

// rememberView saves the current view when the setting is on.
func (m *model) rememberView() {
	if !m.settings.RememberView || m.settings.View == m.scope.key() {
		return
	}
	m.settings.View = m.scope.key()
	if err := m.settings.save(m.settingsPath); err != nil {
		m.status = errorStyle.Render("Could not save settings: " + err.Error())
	}
}

// open switches to the given day and scope. Cached days show at once; refresh
// fetches the day again.
func (m model) open(day time.Time, s scope, refresh bool) (tea.Model, tea.Cmd) {
	m.list = listDay
	m.day, m.scope = day, s
	m.cursor, m.offset = 0, 0
	m.status = ""

	var cmds []tea.Cmd
	k := dayKey(day)
	store, cached := m.days[k]
	m.loading = !cached || refresh
	if m.loading && (refresh || !m.pending[k]) {
		m.pending[k] = true
		cmds = append(cmds, fetchDay(m.service, day, m.historyID == 0))
	}
	if cached && !refresh {
		m.status = failedStatus(store.Failed)
	}
	m.refreshView()
	cmds = append(cmds, m.prefetch())
	return m, tea.Batch(cmds...)
}

func (m model) dayLoaded(msg dayLoadedMsg) (tea.Model, tea.Cmd) {
	delete(m.pending, msg.day)
	current := msg.day == dayKey(m.day)
	if msg.err != nil {
		if current {
			m.loading = false
			m.status = errorStyle.Render("Error: " + msg.err.Error())
		}
		return m, nil
	}
	m.storeDay(msg.day, msg.emails, msg.failed)
	if m.historyID == 0 {
		m.historyID = msg.historyID
	}
	if current {
		m.loading = false
		m.status = failedStatus(msg.failed)
		m.refreshView()
	}
	return m, m.saveCache()
}

func failedStatus(failed int) string {
	if failed == 0 {
		return ""
	}
	return errorStyle.Render(fmt.Sprintf("%s failed to load (r to retry)", plural(failed)))
}

// prefetch loads the days before the shown one in the background.
func (m *model) prefetch() tea.Cmd {
	var cmds []tea.Cmd
	for i := 1; i <= prefetchGap; i++ {
		d := m.day.AddDate(0, 0, -i)
		k := dayKey(d)
		if _, ok := m.days[k]; ok || m.pending[k] {
			continue
		}
		m.pending[k] = true
		cmds = append(cmds, fetchDay(m.service, d, false))
	}
	return tea.Batch(cmds...)
}

// refreshView recomputes the shown day from the cache, keeping the cursor on
// the same mail when it is still listed.
func (m *model) refreshView() {
	cur, hasCur := m.selectedEmail()
	var es []email
	if m.list == listAll {
		es = m.resolve(m.all.ids) // already filtered by Gmail
	} else {
		for _, e := range m.dayMails(dayKey(m.day)) {
			if m.scope.match(e) {
				es = append(es, e)
			}
		}
	}
	m.data = newDayData(es, 0)
	m.pruneSelection()
	m.rebuild()
	if hasCur {
		m.cursorTo(cur.ID)
	}
}

// grouped reports whether the list groups mails by sender; a single
// sender's list never does.
func (m model) grouped() bool {
	return m.settings.GroupBySender && !(m.list == listAll && m.all.sender != nil)
}

// rebuild recomputes the visible rows from the mails, grouping and fold state.
func (m *model) rebuild() {
	m.rows = nil
	if !m.grouped() {
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

// listHeight is the screen height minus title, column header, status and help.
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
	if m.list == listAll {
		title = "All mail · " + m.all.filter.String()
		if v := m.all.sender; v != nil {
			title = "Sender · " + v.name + " · " + v.rangeText()
			if m.all.filter == filterUnread {
				title += " · Unread"
			}
		}
		if m.all.search != "" {
			title += " · “" + m.all.search + "”"
		}
	}
	unread := 0
	for _, e := range m.data.emails {
		if e.Unread {
			unread++
		}
	}
	meta := fmt.Sprintf("  %s · %s · %d unread · %s", m.scope, plural(len(m.data.emails)), unread, count(len(m.data.groups), "sender"))
	if m.list == listAll {
		meta = fmt.Sprintf("  %s · %d of ≈%d loaded · %d unread", m.scope, len(m.data.emails), max(m.all.estimate, int64(len(m.data.emails))), unread)
	}
	if m.inboxUnread >= 0 {
		meta += fmt.Sprintf(" │ Inbox: %d unread", m.inboxUnread)
	}
	if n := len(m.selected); n > 0 {
		meta += fmt.Sprintf(" │ %d selected", n)
		here := 0
		for _, e := range m.data.emails {
			if m.selected[e.ID] {
				here++
			}
		}
		if other := n - here; other > 0 {
			where := "on other days"
			if m.list == listAll {
				where = "not listed"
			}
			meta += fmt.Sprintf(" (%d %s)", other, where)
		}
	}
	b.WriteString(ansi.Truncate(titleStyle.Render(title)+dimStyle.Render(meta), m.width, "…") + "\n")
	b.WriteString(m.columnHeader() + "\n")

	h := m.listHeight()
	loading := m.loading
	empty := " No mail on this day."
	if m.list == listAll {
		loading, empty = m.all.loading, " No mail matches."
	}
	switch {
	case len(m.rows) == 0 && loading:
		b.WriteString(" Loading…\n")
		h--
	case len(m.rows) == 0:
		b.WriteString(dimStyle.Render(empty) + "\n")
		h--
	}
	end := min(m.offset+h, len(m.rows))
	for i := m.offset; i < end; i++ {
		b.WriteString(m.renderRow(m.rows[i], i == m.cursor) + "\n")
	}
	b.WriteString(strings.Repeat("\n", max(0, h-(end-m.offset))))

	switch {
	case m.list == listDay && m.loading:
		b.WriteString(" Loading " + m.scope.String() + "…\n")
	case m.list == listAll && m.all.err != nil:
		b.WriteString(" " + errorStyle.Render("Error: "+m.all.err.Error()) + " (r to retry)\n")
	case m.list == listAll && m.all.loading && len(m.rows) > 0:
		b.WriteString(" Loading more…\n")
	default:
		b.WriteString(m.footerStatus())
	}
	if m.list == listAll {
		keys := []keyHelp{{"?", "help"}, {"a", "day view"}, {"f", "filter"}, {"/", "search"}, {"enter", "read"}, {"x", "select"}}
		if m.all.sender != nil {
			keys[1] = keyHelp{"esc", "senders"}
		}
		b.WriteString(m.helpBar(append(keys, m.actionKeys()...)...))
		return b.String()
	}
	keys := []keyHelp{{"?", "help"}, {"h/l", "day"}, {"enter", "read"}, {"x", "select"}}
	keys = append(keys, m.actionKeys()...)
	b.WriteString(m.helpBar(append(keys, keyHelp{"q", "quit"})...))
	return b.String()
}

func (m model) footerStatus() string {
	if m.status == "" {
		return "\n"
	}
	return " " + ansi.Truncate(m.status, m.width-1, "…") + "\n"
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
	prefix := indent + pad(m.timeText(e), m.timeWidth()) + " " + mark + " "
	labels := pad(m.labelText(e), labelWidth) + "  "
	sender := ""
	if r.group < 0 {
		sender = pad(e.FromName, senderWidth) + "  "
	}
	snippet := ""
	if e.Snippet != "" {
		snippet = " — " + e.Snippet
	}

	if cursor {
		line := m.check(m.selected[e.ID], true) + prefix + labels + sender + e.Subject + snippet
		return selectedStyle.Width(m.width).Render(ansi.Truncate(line, m.width, "…"))
	}
	subject := e.Subject
	switch {
	case e.Unread:
		subject = unreadStyle.Render(subject)
	case !inInbox(e):
		subject = archivedStyle.Render(subject)
	}
	if sender != "" {
		sender = senderStyle.Render(sender)
	}
	return ansi.Truncate(m.check(m.selected[e.ID], false)+prefix+labelStyle.Render(labels)+sender+subject+dimStyle.Render(snippet), m.width, "…")
}

// columnHeader names the columns of renderRow; in the grouped list the sender
// is the group header, so it has no column.
func (m model) columnHeader() string {
	indent := "  "
	if m.grouped() {
		indent = "    "
	}
	col := "Time"
	if m.list == listAll {
		col = "Date"
	}
	h := indent + pad(col, m.timeWidth()) + "   " + pad("Labels", labelWidth) + "  "
	if !m.grouped() {
		h += pad("Sender", senderWidth) + "  "
	}
	return dimStyle.Render(ansi.Truncate(h+"Subject", m.width, "…"))
}

// timeWidth is the width of the time column: a time in the day list, a date
// in the all-mail list.
func (m model) timeWidth() int {
	if m.list == listAll {
		return len(time.DateOnly)
	}
	return 5
}

// timeText is a mail's time column: "15:04" in the day list; in the all-mail
// list "15:04" for today, "Jan 02" for this year, else "2006-01-02".
func (m model) timeText(e email) string {
	switch {
	case m.list != listAll || dayKey(e.Time) == dayKey(today()):
		return e.Time.Format("15:04")
	case e.Time.Year() == today().Year():
		return e.Time.Format("Jan 02")
	}
	return e.Time.Format(time.DateOnly)
}

// pad truncates or pads s to exactly w cells.
func pad(s string, w int) string {
	s = ansi.Truncate(s, w, "…")
	return s + strings.Repeat(" ", w-ansi.StringWidth(s))
}

// labelText lists a mail's star and user labels, e.g. "★ Work, Receipts".
func (m model) labelText(e email) string {
	var parts []string
	if slices.Contains(e.Labels, "STARRED") {
		parts = append(parts, "★")
	}
	var names []string
	for _, l := range m.labels {
		if strings.HasPrefix(l.ID, "Label_") && slices.Contains(e.Labels, l.ID) {
			names = append(names, l.Name)
		}
	}
	if len(names) > 0 {
		parts = append(parts, strings.Join(names, ", "))
	}
	return strings.Join(parts, " ")
}

// --- COMMANDS ---
type inboxUnreadMsg struct {
	n   int64
	err error
}

// fetchInboxUnread reads the inbox's unread count across all days.
func fetchInboxUnread(srv *gmail.Service) tea.Cmd {
	return func() tea.Msg {
		l, err := srv.Users.Labels.Get("me", "INBOX").Fields("messagesUnread").Do()
		if err != nil {
			return inboxUnreadMsg{err: err}
		}
		return inboxUnreadMsg{n: l.MessagesUnread}
	}
}

// fetchDay loads a day. withHistory first reads the mailbox history id, so
// changes made while listing are picked up by the next sync.
func fetchDay(srv *gmail.Service, day time.Time, withHistory bool) tea.Cmd {
	k := dayKey(day)
	return func() tea.Msg {
		msg := dayLoadedMsg{day: k}
		if withHistory {
			p, err := srv.Users.GetProfile("me").Fields("historyId").Do()
			if err != nil {
				msg.err = err
				return msg
			}
			msg.historyID = p.HistoryId
		}
		msg.emails, msg.failed, msg.err = loadDay(srv, day)
		return msg
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
