package application

import (
	"os"
	"path/filepath"
	"slices"
	"testing"
	"time"
)

func TestCacheRoundTrip(t *testing.T) {
	path := filepath.Join(t.TempDir(), "cache.json")
	m := loaded(t)
	m.cachePath = path
	m.historyID = 42
	old := dayKey(today().AddDate(0, 0, -keepDays-1))
	m.storeDay(old, []email{{ID: "old"}}, 0)
	m.storeDay("2026-01-02", []email{{ID: "partial"}}, 1)
	if msg := m.saveCache()(); msg != nil {
		t.Fatalf("save: %v", msg)
	}

	mails, days, hid := loadCache(path)
	if hid != 42 || len(days) != 1 || len(days[dayKey(today())].IDs) != 3 || len(mails) != 3 {
		t.Fatalf("loaded hid=%d days=%v", hid, slices.Collect(func(yield func(string) bool) {
			for k := range days {
				yield(k)
			}
		}))
	}

	// a restart with a cached today shows it at once and fetches nothing for it
	r := NewApplication(nil, Options{Settings: defaultSettings(), CachePath: path})
	if r.loading || r.pending[dayKey(today())] || len(r.data.emails) != 3 {
		t.Errorf("restart: loading=%v pending=%v mails=%d", r.loading, r.pending, len(r.data.emails))
	}
}

func TestPrefetchPreviousDay(t *testing.T) {
	m := loaded(t)
	cmd := m.prefetch()
	if cmd == nil || !m.pending[dayKey(today().AddDate(0, 0, -1))] {
		t.Fatalf("yesterday not prefetched")
	}
	if m.prefetch() != nil {
		t.Errorf("prefetched twice")
	}
	// opening yesterday while it is in flight does not fetch again
	next, _ := m.open(today().AddDate(0, 0, -1), m.scope, false)
	m = next.(model)
	if !m.loading {
		t.Errorf("yesterday should show loading")
	}
	next, _ = m.Update(dayLoadedMsg{day: dayKey(m.day), emails: []email{{ID: "y1", Time: m.day.Add(time.Hour)}}})
	m = next.(model)
	if m.loading || len(m.data.emails) != 1 {
		t.Errorf("yesterday not shown: loading=%v mails=%d", m.loading, len(m.data.emails))
	}
}

func TestSyncApplies(t *testing.T) {
	m := loaded(t)
	m.historyID = 10
	t0 := today().Add(12 * time.Hour)
	next, _ := m.Update(syncedMsg{
		historyID: 20,
		deleted:   []string{"3"},
		updated: []email{
			{ID: "1", FromAddr: "gh@x", Subject: "PR merged", Time: today().Add(9 * time.Hour), Labels: []string{"INBOX"}}, // read elsewhere
			{ID: "new", FromAddr: "n@x", Subject: "Hello", Time: t0, Labels: []string{"INBOX", "UNREAD"}, Unread: true},
			{ID: "sent", FromAddr: "me@x", Time: t0, Labels: []string{"SENT"}},
			{ID: "spam", FromAddr: "s@x", Time: t0, Labels: []string{"SPAM"}},
			{ID: "otherday", FromAddr: "o@x", Time: today().AddDate(0, 0, -30)},
		},
	})
	m = next.(model)
	var got []string
	for _, e := range m.dayMails(dayKey(today())) {
		got = append(got, e.ID)
	}
	if !slices.Equal(got, []string{"new", "2", "1"}) {
		t.Fatalf("today = %v", got)
	}
	if m.historyID != 20 || m.status != "1 mail arrived" || m.syncing {
		t.Errorf("hid=%d status=%q syncing=%v", m.historyID, m.status, m.syncing)
	}
	if _, ok := m.days[dayKey(today().AddDate(0, 0, -30))]; ok {
		t.Errorf("uncached day was created")
	}
	for _, e := range m.dayMails(dayKey(today())) {
		if e.ID == "1" && e.Unread {
			t.Errorf("read state not synced")
		}
	}
}

func TestSyncExpiredReloads(t *testing.T) {
	m := loaded(t)
	m.historyID = 10
	next, cmd := m.Update(syncedMsg{expired: true})
	m = next.(model)
	if len(m.days) != 0 || m.historyID != 0 || !m.loading || cmd == nil {
		t.Errorf("expired: days=%d hid=%d loading=%v", len(m.days), m.historyID, m.loading)
	}
}

func TestReceivable(t *testing.T) {
	if !receivable(email{Labels: []string{"INBOX", "UNREAD"}}) || receivable(email{Labels: []string{"TRASH"}}) {
		t.Error("receivable wrong")
	}
}

func TestLoadCacheV1(t *testing.T) {
	path := filepath.Join(t.TempDir(), "cache.json")
	v1 := `{"version":1,"history_id":7,"days":{"2026-10-29":[{"ID":"a","Subject":"hi"},{"ID":"b"}],"2026-10-28":[]}}`
	if err := os.WriteFile(path, []byte(v1), 0600); err != nil {
		t.Fatal(err)
	}
	mails, days, hid := loadCache(path)
	if hid != 7 || len(mails) != 2 || mails["a"].Subject != "hi" || len(days) != 2 || !slices.Equal(days["2026-10-29"].IDs, []string{"a", "b"}) {
		t.Errorf("v1 load: hid=%d mails=%v days=%v", hid, mails, days)
	}
}
