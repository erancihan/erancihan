package application

import (
	"context"
	"fmt"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"google.golang.org/api/gmail/v1"
)

// Sender counts need each mail's From header, so a range is loaded as: one
// listing of ids, then metadata in chunks for the ids not stored yet. Chunks
// run one after another so the view can show progress.

const (
	statsChunk   = 200    // metadata requests per chunk
	maxAllTime   = 10_000 // newest mails counted for "all time"
	allTimeLabel = "all time"
)

type statsIDsMsg struct {
	key       statsKey
	ids       []string
	truncated bool
	err       error
}

type statsChunkMsg struct {
	key    statsKey
	emails []email
	gone   int // mails Gmail no longer has
	failed int
}

// statsQuery is the Gmail search for the senders range.
func (m model) statsQuery(s stats) string {
	q := s.key.scope.query()
	if !s.allTime {
		q = fmt.Sprintf("after:%d before:%d %s", s.from.Unix(), s.to.AddDate(0, 0, 1).Unix(), q)
	}
	return q
}

// startStatsFetch lists the range's ids; statsIDs then fetches what is missing.
func (m model) startStatsFetch() (tea.Model, tea.Cmd) {
	m.stats.loading = true
	limit := maxPerRange
	if m.stats.allTime {
		limit = maxAllTime
	}
	return m, fetchStatsIDs(m.service, m.statsQuery(m.stats), limit, m.stats.key)
}

func (m model) statsIDs(msg statsIDsMsg) (tea.Model, tea.Cmd) {
	if msg.key != m.stats.key {
		return m, nil
	}
	if msg.err != nil {
		m.stats.loading, m.stats.err = false, msg.err
		return m, nil
	}
	m.stats.ids, m.stats.truncated = msg.ids, msg.truncated
	m.stats.todo = nil
	for _, id := range msg.ids {
		if _, ok := m.mails[id]; !ok {
			m.stats.todo = append(m.stats.todo, id)
		}
	}
	m.stats.progress = [2]int{0, len(m.stats.todo)}
	return m.nextStatsChunk()
}

func (m model) statsChunkDone(msg statsChunkMsg) (tea.Model, tea.Cmd) {
	if msg.key != m.stats.key {
		return m, nil // the range changed; drop the rest
	}
	for _, e := range msg.emails {
		m.mails[e.ID] = e
	}
	m.stats.failed += msg.failed + msg.gone
	m.stats.progress[0] += len(msg.emails) + msg.failed + msg.gone
	return m.nextStatsChunk()
}

// nextStatsChunk fetches the next chunk of missing metadata, or summarizes
// when nothing is missing.
func (m model) nextStatsChunk() (tea.Model, tea.Cmd) {
	if len(m.stats.todo) == 0 {
		s := m.stats
		return m.statsLoaded(statsLoadedMsg{key: s.key, from: s.from, to: s.to,
			emails: m.resolve(s.ids), failed: s.failed, truncated: s.truncated})
	}
	n := min(statsChunk, len(m.stats.todo))
	chunk := m.stats.todo[:n]
	m.stats.todo = m.stats.todo[n:]
	return m, fetchStatsChunk(m.service, m.stats.key, chunk)
}

// --- ALL TIME ---
func (m model) confirmAllTime() model {
	m.modal = modalConfirm
	m.confirm = confirmState{
		kind: confirmAllTime,
		text: "Count senders over all time?",
		detail: fmt.Sprintf("This counts the newest %s mails. Gmail needs one request per mail,\n"+
			"so the first run can take several minutes. Mails already stored are not fetched again.",
			commas(maxAllTime)),
	}
	return m
}

func (m model) openStatsAllTime(refresh bool) (tea.Model, tea.Cmd) {
	m.mode = modeStats
	m.status = ""
	key := statsKey{from: allTimeLabel, scope: m.scope}
	m.stats = stats{from: m.stats.from, to: m.stats.to, allTime: true, key: key}
	if d, ok := m.statsCache[key]; ok && !refresh {
		m.stats.data = d
		return m, nil
	}
	return m.startStatsFetch()
}

// commas formats n with thousands separators.
func commas(n int) string {
	s := fmt.Sprint(n)
	for i := len(s) - 3; i > 0; i -= 3 {
		s = s[:i] + "," + s[i:]
	}
	return s
}

// --- SENDER MAIL ---

// senderView narrows the all-mail list to one sender over the senders range.
type senderView struct {
	name, addr string
	from, to   time.Time
	allTime    bool
}

func (v senderView) query() string {
	q := "from:" + v.addr
	if !v.allTime {
		q += fmt.Sprintf(" after:%d before:%d", v.from.Unix(), v.to.AddDate(0, 0, 1).Unix())
	}
	return q
}

func (v senderView) rangeText() string {
	if v.allTime {
		return allTimeLabel
	}
	return formatRange(v.from, v.to)
}

// savedList is the mail list state put aside while a sender's mail is shown.
type savedList struct {
	all            allList
	list           listKind
	cursor, offset int
}

// openSenderMails shows the mails of a sender over the senders range as a mail list.
func (m model) openSenderMails(s senderStat) (tea.Model, tea.Cmd) {
	m.back = &savedList{all: m.all, list: m.list, cursor: m.cursor, offset: m.offset}
	m.all = allList{filter: filterAll, sender: &senderView{
		name: s.name, addr: s.addr, from: m.stats.from, to: m.stats.to, allTime: m.stats.allTime,
	}}
	m.mode = modeDay
	return m.openAll(true)
}

// leaveSenderMails returns to the senders list, restoring the mail list.
func (m model) leaveSenderMails() (tea.Model, tea.Cmd) {
	b := m.back
	m.back = nil
	m.all, m.list = b.all, b.list
	m.refreshView()
	m.cursor, m.offset = b.cursor, b.offset
	m.scroll()
	m.mode = modeStats
	m.status = ""
	return m, nil
}

// --- COMMANDS ---
func fetchStatsIDs(srv *gmail.Service, q string, limit int, key statsKey) tea.Cmd {
	return func() tea.Msg {
		ids, truncated, err := listIDs(context.Background(), srv, q, limit)
		return statsIDsMsg{key: key, ids: ids, truncated: truncated, err: err}
	}
}

func fetchStatsChunk(srv *gmail.Service, key statsKey, ids []string) tea.Cmd {
	return func() tea.Msg {
		emails, gone, failed := getMetadata(context.Background(), srv, ids)
		return statsChunkMsg{key: key, emails: emails, gone: len(gone), failed: failed}
	}
}
