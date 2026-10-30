package application

import (
	"fmt"
	"strings"
	"testing"

	"github.com/charmbracelet/x/ansi"
)

func TestStatsChunkedLoading(t *testing.T) {
	m := loaded(t) // stores mails 1, 2, 3
	m = press(t, m, "s")
	if !m.stats.loading || m.stats.ids != nil {
		t.Fatal("expected id listing")
	}
	var ids []string
	for i := range 450 {
		ids = append(ids, fmt.Sprint("n", i))
	}
	ids = append(ids, "1", "2") // stored already: not fetched
	next, cmd := m.Update(statsIDsMsg{key: m.stats.key, ids: ids})
	m = next.(model)
	if cmd == nil || m.stats.progress != [2]int{0, 450} || len(m.stats.todo) != 450-statsChunk {
		t.Fatalf("progress=%v todo=%d", m.stats.progress, len(m.stats.todo))
	}
	chunk := func(from, n int) statsChunkMsg {
		var es []email
		for i := from; i < from+n; i++ {
			es = append(es, email{ID: fmt.Sprint("n", i), FromName: "Bulk", FromAddr: "bulk@x", Time: today()})
		}
		return statsChunkMsg{key: m.stats.key, emails: es}
	}
	next, _ = m.Update(chunk(0, 200))
	m = next.(model)
	if !strings.Contains(ansi.Strip(m.View()), "Loading senders… 200 / 450 mails") {
		t.Errorf("progress view:\n%s", ansi.Strip(m.View()))
	}
	next, _ = m.Update(chunk(200, 200))
	m = next.(model)
	next, _ = m.Update(chunk(400, 49))
	m = next.(model)
	next, _ = m.Update(statsChunkMsg{key: m.stats.key, gone: 1}) // stale id, never arrives
	m = next.(model)
	if m.stats.loading || m.stats.data.total != 451 || m.stats.data.senders[0].addr != "bulk@x" || m.stats.data.failed != 1 {
		t.Errorf("done: loading=%v total=%d failed=%d", m.stats.loading, m.stats.data.total, m.stats.data.failed)
	}
}

func TestStatsChunkForOldRangeDropped(t *testing.T) {
	m := loaded(t)
	m = press(t, m, "s")
	old := m.stats.key
	next, _ := m.Update(statsIDsMsg{key: old, ids: []string{"x1"}})
	m = next.(model)
	m = press(t, m, "h") // range changes while loading
	next, cmd := m.Update(statsChunkMsg{key: old, emails: []email{{ID: "x1"}}})
	m = next.(model)
	if cmd != nil || m.stats.key == old {
		t.Error("old chunk continued the pipeline")
	}
}

func TestAllTimeAsksFirst(t *testing.T) {
	m := loaded(t)
	m.width, m.height = 120, 30
	m = press(t, m, "s", "a")
	if m.modal != modalConfirm || !strings.Contains(ansi.Strip(m.View()), "Count senders over all time?") {
		t.Fatalf("no confirmation:\n%s", ansi.Strip(m.View()))
	}
	m = press(t, m, "n")
	if m.stats.allTime {
		t.Fatal("n started all time")
	}
	m = press(t, m, "a", "y")
	if !m.stats.allTime || !m.stats.loading || strings.Contains(m.statsQuery(m.stats), "after:") {
		t.Errorf("all time: %v loading=%v q=%q", m.stats.allTime, m.stats.loading, m.statsQuery(m.stats))
	}
	if !strings.Contains(ansi.Strip(m.View()), "all time (newest 10,000)") {
		t.Errorf("title:\n%s", ansi.Strip(m.View()))
	}
	m = press(t, m, "tab") // back to the range
	if m.stats.allTime || m.stats.days() != 7 {
		t.Errorf("tab: allTime=%v days=%d", m.stats.allTime, m.stats.days())
	}
}

func TestSenderMails(t *testing.T) {
	m := loaded(t)
	m.width, m.height = 120, 20
	m = press(t, m, "a") // an all-mail list is open before
	next, _ := m.Update(pageMsg(m.all.gen, page(5, 1, today()), "", 5))
	m = next.(model)
	m = press(t, m, "esc", "s")
	next, _ = m.Update(statsLoadedMsg{key: m.stats.key, from: m.stats.from, to: m.stats.to, emails: m.dayMails(dayKey(today()))})
	m = next.(model)
	m = press(t, m, "enter") // GitHub, the busiest sender
	if m.mode != modeDay || m.list != listAll || m.all.sub == nil || !strings.Contains(m.all.sub.query, "from:gh@x") {
		t.Fatalf("sender view: mode=%v list=%v", m.mode, m.list)
	}
	q := m.allQuery()
	if !strings.Contains(q, "from:gh@x after:") || strings.Contains(q, "is:unread") {
		t.Errorf("query = %q", q)
	}
	next, _ = m.Update(pageMsg(m.all.gen, nil, "", 0))
	m = next.(model)
	next, _ = m.Update(allLoadedMsg{gen: m.all.gen, ids: []string{"2", "1"}})
	m = next.(model)
	v := ansi.Strip(m.View())
	if len(m.rows) != 2 || strings.Contains(v, "▾") || !strings.Contains(v, "Sender · GitHub · ") || !strings.Contains(v, "esc senders") {
		t.Errorf("rows=%d view:\n%s", len(m.rows), v)
	}
	// reading and coming back stays in the sender list; esc returns to senders
	m = press(t, m, "enter", "q")
	if m.list != listAll || m.all.sub == nil {
		t.Fatal("reader back left the sender list")
	}
	m = press(t, m, "esc")
	if m.mode != modeStats || m.back != nil || m.all.sub != nil || len(m.all.ids) != 5 {
		t.Errorf("back: mode=%v all=%d", m.mode, len(m.all.ids))
	}
	m = press(t, m, "q", "a") // the earlier all-mail list is intact
	if len(m.data.emails) != 5 {
		t.Errorf("all-mail list lost: %d", len(m.data.emails))
	}
}

func TestCommas(t *testing.T) {
	for n, want := range map[int]string{7: "7", 1200: "1,200", 10000: "10,000", 1234567: "1,234,567"} {
		if got := commas(n); got != want {
			t.Errorf("commas(%d) = %q", n, got)
		}
	}
}
