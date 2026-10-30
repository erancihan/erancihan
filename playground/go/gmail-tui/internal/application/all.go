package application

import (
	"context"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"google.golang.org/api/gmail/v1"
)

const (
	allPageSize  = 100 // mails per page in the all-mail list
	allLoadAhead = 10  // load the next page when the cursor is this close to the end
)

// listKind is what the mail list shows: one day, or all mail matching a query.
type listKind int

const (
	listDay listKind = iota
	listAll
)

// allFilter narrows the all-mail list.
type allFilter int

const (
	filterUnread allFilter = iota
	filterAll
)

func (f allFilter) String() string {
	if f == filterAll {
		return "All"
	}
	return "Unread"
}

// allList is the state of the all-mail list: the ids Gmail returned for the
// query, resolved through the mail store. Like Gmail, mails that stop matching
// (e.g. read in the Unread filter) stay listed until reload.
type allList struct {
	filter   allFilter
	search   string      // extra Gmail query from the search dialog
	sender   *senderView // set when showing one sender's mail from the senders view
	ids      []string    // in Gmail's order, newest first
	next     string      // page token of the next page; "" when complete
	estimate int64       // Gmail's estimate of matching mails
	loading  bool
	loaded   bool  // at least one page arrived for the current query
	gen      int   // increases with each new query; stale pages are dropped
	failed   int   // mails that failed to load
	err      error // error of the last page request
}

type allLoadedMsg struct {
	gen      int
	ids      []string // the page, in order
	emails   []email  // metadata of the page's mails that were not stored yet
	next     string
	estimate int64
	failed   int
	err      error
}

// query is the Gmail search for the list.
func (m model) allQuery() string {
	q := []string{m.scope.query()}
	if m.all.filter == filterUnread {
		q = append(q, "is:unread")
	}
	if m.all.sender != nil {
		q = append(q, m.all.sender.query())
	}
	if s := strings.TrimSpace(m.all.search); s != "" {
		q = append(q, s)
	}
	return strings.Join(q, " ")
}

// openAll switches to the all-mail list; reload starts the query over.
func (m model) openAll(reload bool) (tea.Model, tea.Cmd) {
	m.list = listAll
	m.status = ""
	if m.all.loaded && !reload {
		m.refreshView()
		return m, nil
	}
	m.listGen++
	m.all.gen = m.listGen
	m.all.ids, m.all.next, m.all.loaded, m.all.failed, m.all.err = nil, "", false, 0, nil
	m.all.loading = true
	m.cursor, m.offset = 0, 0
	m.refreshView()
	return m, fetchAll(m.service, m.allQuery(), "", m.all.gen, m.knownIDs())
}

func (m model) allLoaded(msg allLoadedMsg) (tea.Model, tea.Cmd) {
	if msg.gen != m.all.gen {
		return m, nil
	}
	m.all.loading = false
	m.all.err = msg.err
	if msg.err != nil {
		return m, nil
	}
	if !m.all.loaded {
		m.all.estimate = msg.estimate
	}
	m.all.loaded = true
	m.all.next = msg.next
	m.all.failed += msg.failed
	for _, e := range msg.emails {
		m.mails[e.ID] = e
	}
	listed := map[string]bool{}
	for _, id := range m.all.ids {
		listed[id] = true
	}
	for _, id := range msg.ids {
		if _, ok := m.mails[id]; ok && !listed[id] {
			m.all.ids = append(m.all.ids, id)
			listed[id] = true
		}
	}
	if m.list == listAll {
		m.refreshView()
	}
	return m, tea.Batch(m.loadMoreIfNeeded(), m.saveCache())
}

// loadMoreIfNeeded fetches the next page when the cursor nears the end.
func (m *model) loadMoreIfNeeded() tea.Cmd {
	if m.list != listAll || m.all.loading || m.all.next == "" || m.cursor < len(m.rows)-allLoadAhead {
		return nil
	}
	m.all.loading = true
	return fetchAll(m.service, m.allQuery(), m.all.next, m.all.gen, m.knownIDs())
}

// updateAll handles keys specific to the all-mail list; ok is false for keys
// it does not handle.
func (m model) updateAll(msg tea.KeyMsg) (_ tea.Model, _ tea.Cmd, ok bool) {
	switch msg.String() {
	case "a", "esc", "s":
		if m.all.sender != nil {
			next, cmd := m.leaveSenderMails()
			return next, cmd, true
		}
		if msg.String() == "s" {
			return m, nil, false
		}
		next, cmd := m.open(m.day, m.scope, false)
		return next, cmd, true
	case "f":
		m.all.filter = 1 - m.all.filter
		next, cmd := m.openAll(true)
		return next, cmd, true
	case "/":
		m.modal = modalSearch
		m.searchIn = m.all.search
		return m, nil, true
	case "r":
		next, cmd := m.openAll(true)
		return next, cmd, true
	case "tab":
		m.scope = 1 - m.scope
		m.rememberView()
		next, cmd := m.openAll(true)
		return next, cmd, true
	case "h", "left", "l", "right", "t":
		return m, nil, true // day navigation does not apply here
	}
	return m, nil, false
}

// --- SEARCH DIALOG ---
func (m model) updateSearch(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc":
		m.modal = modalNone
	case "enter":
		m.modal = modalNone
		m.all.search = strings.TrimSpace(m.searchIn)
		return m.openAll(true)
	case "backspace":
		if r := []rune(m.searchIn); len(r) > 0 {
			m.searchIn = string(r[:len(r)-1])
		}
	case "ctrl+u":
		m.searchIn = ""
	default:
		if msg.Type == tea.KeyRunes || msg.Type == tea.KeySpace {
			m.searchIn += string(msg.Runes)
		}
	}
	return m, nil
}

func (m model) viewSearch() string {
	return strings.Join([]string{
		titleStyle.Render("Search all mail"),
		dimStyle.Render("Gmail query, e.g. from:github older_than:1y label:work"),
		"",
		"> " + m.searchIn + "▏",
		"",
		m.keyLine(keyHelp{"enter", "search"}, keyHelp{"ctrl+u", "clear"}, keyHelp{"esc", "cancel"}),
	}, "\n")
}

// --- COMMANDS ---

// fetchAll lists one page of ids for q and fetches metadata only for mails
// that are not stored yet.
func fetchAll(srv *gmail.Service, q, pageToken string, gen int, known map[string]bool) tea.Cmd {
	return func() tea.Msg {
		ctx := context.Background()
		call := srv.Users.Messages.List("me").Q(q).MaxResults(allPageSize).
			Fields("messages/id", "nextPageToken", "resultSizeEstimate")
		if pageToken != "" {
			call = call.PageToken(pageToken)
		}
		r, err := call.Context(ctx).Do()
		if err != nil {
			return allLoadedMsg{gen: gen, err: err}
		}
		msg := allLoadedMsg{gen: gen, next: r.NextPageToken, estimate: r.ResultSizeEstimate}
		var missing []string
		for _, m := range r.Messages {
			msg.ids = append(msg.ids, m.Id)
			if !known[m.Id] {
				missing = append(missing, m.Id)
			}
		}
		emails, gone, failed := getMetadata(ctx, srv, missing)
		msg.emails, msg.failed = emails, failed+len(gone)
		return msg
	}
}
