package application

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"sync"
	"sync/atomic"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"google.golang.org/api/gmail/v1"
)

// Mail never arrives in the past, so a fetched day stays complete. Only changes
// to known mails (read state, labels, trash) and new mail for today need
// tracking; Gmail's History API reports both since a saved history id.

const (
	cacheVersion = 1
	syncInterval = time.Minute
)

// dayStore is every received mail of one day, newest first.
type dayStore struct {
	Emails []email
	Failed int // mails that failed to load; such days are not saved to disk
}

// diskCache is the cache.json format.
type diskCache struct {
	Version   int                `json:"version"`
	HistoryID uint64             `json:"history_id"`
	Days      map[string][]email `json:"days"`
}

// loadCache reads the cached days; a missing, unreadable or outdated file
// yields an empty cache.
func loadCache(path string) (map[string]dayStore, uint64) {
	days := map[string]dayStore{}
	b, err := os.ReadFile(path)
	if err != nil {
		return days, 0
	}
	var dc diskCache
	if json.Unmarshal(b, &dc) != nil || dc.Version != cacheVersion {
		return days, 0
	}
	for d, es := range dc.Days {
		days[d] = dayStore{Emails: es}
	}
	return days, dc.HistoryID
}

var (
	saveSeq     atomic.Uint64
	saveMu      sync.Mutex
	lastWritten uint64
)

// saveCache snapshots complete days of the last keepDays days and writes them
// in the background. Writes
// are atomic, and a snapshot older than one already written is dropped.
func (m model) saveCache() tea.Cmd {
	if m.cachePath == "" {
		return nil
	}
	dc := diskCache{Version: cacheVersion, HistoryID: m.historyID, Days: map[string][]email{}}
	oldest := dayKey(today().AddDate(0, 0, -keepDays))
	for d, s := range m.days {
		if s.Failed == 0 && d >= oldest {
			dc.Days[d] = s.Emails
		}
	}
	b, err := json.Marshal(dc)
	seq := saveSeq.Add(1)
	path := m.cachePath
	return func() tea.Msg {
		if err != nil {
			return statusMsg(errorStyle.Render("Could not save cache: " + err.Error()))
		}
		saveMu.Lock()
		defer saveMu.Unlock()
		if seq < lastWritten {
			return nil
		}
		if err := writeAtomic(path, b); err != nil {
			return statusMsg(errorStyle.Render("Could not save cache: " + err.Error()))
		}
		lastWritten = seq
		return nil
	}
}

func writeAtomic(path string, b []byte) error {
	f, err := os.CreateTemp(filepath.Dir(path), ".cache-*.json")
	if err != nil {
		return err
	}
	defer os.Remove(f.Name())
	if _, err := f.Write(b); err != nil {
		f.Close()
		return err
	}
	if err := f.Close(); err != nil {
		return err
	}
	return os.Rename(f.Name(), path) // CreateTemp files are already 0600
}

// --- SYNC ---
type syncTickMsg struct{}

type syncedMsg struct {
	updated   []email  // current metadata of new or changed mails
	deleted   []string // ids gone from Gmail
	historyID uint64
	expired   bool // the saved history id is too old; the cache must be rebuilt
	err       error
}

func syncTick() tea.Cmd {
	return tea.Tick(syncInterval, func(time.Time) tea.Msg { return syncTickMsg{} })
}

func (m model) knownIDs() map[string]bool {
	known := map[string]bool{}
	for _, s := range m.days {
		for _, e := range s.Emails {
			known[e.ID] = true
		}
	}
	return known
}

// syncCmd lists mailbox history since `start` and fetches current metadata for
// new mails and for known mails whose labels changed.
func syncCmd(srv *gmail.Service, start uint64, known map[string]bool) tea.Cmd {
	return func() tea.Msg {
		ctx := context.Background()
		touched := map[string]bool{}
		deleted := map[string]bool{}
		latest := start
		err := srv.Users.History.List("me").StartHistoryId(start).
			HistoryTypes("messageAdded", "messageDeleted", "labelAdded", "labelRemoved").
			Pages(ctx, func(r *gmail.ListHistoryResponse) error {
				latest = max(latest, r.HistoryId)
				for _, h := range r.History {
					for _, a := range h.MessagesAdded {
						touched[a.Message.Id] = true
					}
					for _, d := range h.MessagesDeleted {
						deleted[d.Message.Id] = true
					}
					for _, l := range h.LabelsAdded {
						if known[l.Message.Id] {
							touched[l.Message.Id] = true
						}
					}
					for _, l := range h.LabelsRemoved {
						if known[l.Message.Id] {
							touched[l.Message.Id] = true
						}
					}
				}
				return nil
			})
		if notFound(err) {
			return syncedMsg{expired: true}
		}
		if err != nil {
			return syncedMsg{err: err}
		}

		var ids []string
		for id := range touched {
			if !deleted[id] {
				ids = append(ids, id)
			}
		}
		updated, missing, failed := getMetadata(ctx, srv, ids)
		msg := syncedMsg{updated: updated, historyID: latest}
		if failed > 0 {
			msg.historyID = start // retry the whole window next time; applying it twice is harmless
		}
		for id := range deleted {
			msg.deleted = append(msg.deleted, id)
		}
		msg.deleted = append(msg.deleted, missing...)
		return msg
	}
}

func (m model) startSync() (model, tea.Cmd) {
	if m.historyID == 0 || m.syncing || m.service == nil {
		return m, nil
	}
	m.syncing = true
	return m, syncCmd(m.service, m.historyID, m.knownIDs())
}

// synced applies history changes to the cached days. Mails are only added to
// days that are already cached; other days get them when first loaded.
func (m model) synced(msg syncedMsg) (tea.Model, tea.Cmd) {
	m.syncing = false
	switch {
	case msg.expired:
		m.days = map[string]dayStore{}
		m.historyID = 0
		m.status = "Cache was too old to update, reloading."
		next, cmd := m.open(m.day, m.scope, true)
		return next, tea.Batch(cmd, next.(model).saveCache())
	case msg.err != nil:
		m.status = errorStyle.Render("Sync failed: " + msg.err.Error())
		return m, nil
	}

	gone := map[string]bool{}
	for _, id := range msg.deleted {
		gone[id] = true
	}
	for _, e := range msg.updated {
		gone[e.ID] = true // removed here, re-added below at its current state
	}
	known := m.knownIDs()
	m.dropMails(gone)

	added := 0
	for _, e := range msg.updated {
		d := e.Time.Format(time.DateOnly)
		s, ok := m.days[d]
		if !ok || !receivable(e) {
			continue
		}
		s.Emails = insertByTime(s.Emails, e)
		m.days[d] = s
		if !known[e.ID] {
			added++
		}
	}
	if msg.historyID != 0 {
		m.historyID = msg.historyID
	}
	if added > 0 {
		m.status = fmt.Sprintf("%s arrived", plural(added))
	}
	if len(msg.updated) == 0 && len(msg.deleted) == 0 {
		return m, m.saveCache() // history id moved on
	}
	m.refreshView()
	return m, tea.Batch(m.saveCache(), fetchInboxUnread(m.service))
}

// dropMails removes the given ids from every cached day.
func (m *model) dropMails(ids map[string]bool) {
	for d, s := range m.days {
		kept := slices.DeleteFunc(slices.Clone(s.Emails), func(e email) bool { return ids[e.ID] })
		if len(kept) != len(s.Emails) {
			s.Emails = kept
			m.days[d] = s
		}
	}
}

// insertByTime inserts e into a newest-first slice, returning a new slice.
func insertByTime(es []email, e email) []email {
	i, _ := slices.BinarySearchFunc(es, e, func(a, b email) int { return b.Time.Compare(a.Time) })
	return slices.Insert(slices.Clone(es), i, e)
}
