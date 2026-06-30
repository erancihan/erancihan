package metrics

import (
	"sync"
	"testing"
)

func TestCounterAccumulates(t *testing.T) {
	r := New()
	r.Inc("hits", 1)
	r.Inc("hits", 2)
	if got := r.Counter("hits"); got != 3 {
		t.Fatalf("counter = %v, want 3", got)
	}
	if got := r.Counter("missing"); got != 0 {
		t.Fatalf("unseen counter = %v, want 0", got)
	}
}

func TestGaugeOverwrites(t *testing.T) {
	r := New()
	r.Set("temp", 10)
	r.Set("temp", 42)
	if got := r.Gauge("temp"); got != 42 {
		t.Fatalf("gauge = %v, want 42", got)
	}
}

func TestSnapshotMergesAndCopies(t *testing.T) {
	r := New()
	r.Inc("a", 5)
	r.Set("b", 7)

	snap := r.Snapshot()
	if snap["a"] != 5 || snap["b"] != 7 {
		t.Fatalf("snapshot = %v, want a=5 b=7", snap)
	}
	// Mutating the snapshot must not affect the registry.
	snap["a"] = 999
	if r.Counter("a") != 5 {
		t.Fatal("snapshot is not a copy")
	}
}

func TestNamesSorted(t *testing.T) {
	r := New()
	r.Set("z", 1)
	r.Inc("a", 1)
	r.Set("m", 1)
	got := r.Names()
	want := []string{"a", "m", "z"}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("names = %v, want %v", got, want)
		}
	}
}

// TestConcurrentAccess exercises the lock under -race.
func TestConcurrentAccess(t *testing.T) {
	r := New()
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 1000; j++ {
				r.Inc("c", 1)
				r.Set("g", float64(j))
				_ = r.Snapshot()
			}
		}()
	}
	wg.Wait()
	if got := r.Counter("c"); got != 8000 {
		t.Fatalf("counter = %v, want 8000", got)
	}
}
