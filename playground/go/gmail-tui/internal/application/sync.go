package application

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
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
	cacheVersion = 2
	syncInterval = time.Minute
)

// diskCache is the cache.json format: every mail once, days as id lists.
type diskCache struct {
	Version   int                 `json:"version"`
	HistoryID uint64              `json:"history_id"`
	Mails     map[string]email    `json:"mails"`
	Days      map[string][]string `json:"days"`
}

// diskCacheV1 is the earlier format, where each day held full mail copies.
type diskCacheV1 struct {
	HistoryID uint64             `json:"history_id"`
	Days      map[string][]email `json:"days"`
}

// loadCache reads the cache file; version 1 files are converted. A missing,
// unreadable or unknown file yields an empty cache.
func loadCache(path string) (mails map[string]email, days map[string]dayStore, historyID uint64) {
	mails, days = map[string]email{}, map[string]dayStore{}
	b, err := os.ReadFile(path)
	if err != nil {
		return mails, days, 0
	}
	var head struct {
		Version int `json:"version"`
	}
	if json.Unmarshal(b, &head) != nil {
		return mails, days, 0
	}
	switch head.Version {
	case 1:
		var v1 diskCacheV1
		if json.Unmarshal(b, &v1) != nil {
			return mails, days, 0
		}
		for d, es := range v1.Days {
			ids := make([]string, len(es))
			for i, e := range es {
				mails[e.ID] = e
				ids[i] = e.ID
			}
			days[d] = dayStore{IDs: ids}
		}
		return mails, days, v1.HistoryID
	case cacheVersion:
		var dc diskCache
		if json.Unmarshal(b, &dc) != nil {
			return map[string]email{}, days, 0
		}
		for d, ids := range dc.Days {
			days[d] = dayStore{IDs: ids}
		}
		if dc.Mails != nil {
			mails = dc.Mails
		}
		return mails, days, dc.HistoryID
	}
	return mails, days, 0
}

var (
	saveSeq     atomic.Uint64
	saveMu      sync.Mutex
	lastWritten uint64
)

// saveCache snapshots complete days of the last keepDays days, the mails they
// reference and the mails of the all-mail list, and writes them in the
// background. Writes are atomic, and a snapshot older than one already
// written is dropped.
func (m model) saveCache() tea.Cmd {
	if m.cachePath == "" {
		return nil
	}
	dc := diskCache{Version: cacheVersion, HistoryID: m.historyID, Mails: map[string]email{}, Days: map[string][]string{}}
	keep := func(ids []string) {
		for _, id := range ids {
			if e, ok := m.mails[id]; ok {
				dc.Mails[id] = e
			}
		}
	}
	oldest := dayKey(today().AddDate(0, 0, -keepDays))
	for d, s := range m.days {
		if s.Failed == 0 && d >= oldest {
			dc.Days[d] = s.IDs
			keep(s.IDs)
		}
	}
	keep(m.all.ids)
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

// knownIDs is the set of stored mail ids.
func (m model) knownIDs() map[string]bool {
	known := make(map[string]bool, len(m.mails))
	for id := range m.mails {
		known[id] = true
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

// synced applies history changes to the stored mails. New mails are added to
// days that are already cached; other days get them when first loaded, and
// the all-mail list when reloaded.
func (m model) synced(msg syncedMsg) (tea.Model, tea.Cmd) {
	m.syncing = false
	switch {
	case msg.expired:
		m.mails, m.days = map[string]email{}, map[string]dayStore{}
		m.all = allList{filter: m.all.filter, search: m.all.search}
		m.historyID = 0
		m.status = "Cache was too old to update, reloading."
		next, cmd := m.open(m.day, m.scope, true)
		return next, tea.Batch(cmd, next.(model).saveCache())
	case msg.err != nil:
		m.status = errorStyle.Render("Sync failed: " + msg.err.Error())
		return m, nil
	}

	known := m.knownIDs()
	gone := map[string]bool{}
	for _, id := range msg.deleted {
		gone[id] = true
	}
	added := 0
	for _, e := range msg.updated {
		switch {
		case !receivable(e):
			gone[e.ID] = true
		case known[e.ID]:
			m.mails[e.ID] = e
			m.addToDay(e)
		default:
			if _, ok := m.days[dayKey(e.Time)]; ok && m.addToDay(e) {
				added++
			}
		}
	}
	m.removeMails(gone)

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
