package transport

import (
	"testing"
	"time"
)

func TestRateLimiterUnlimited(t *testing.T) {
	rl := newRateLimiter(0)
	now := time.Unix(0, 0)
	for i := 0; i < 5; i++ {
		if !rl.allow(now) {
			t.Fatalf("unlimited limiter dropped a frame at step %d", i)
		}
	}
}

func TestRateLimiterThrottles(t *testing.T) {
	rl := newRateLimiter(10) // 10 fps => 100ms spacing
	base := time.Unix(100, 0)

	// First frame always passes.
	if !rl.allow(base) {
		t.Fatal("first frame should pass")
	}
	// Too soon: dropped.
	if rl.allow(base.Add(50 * time.Millisecond)) {
		t.Fatal("frame at +50ms should be dropped (interval 100ms)")
	}
	// Exactly at the interval: passes.
	if !rl.allow(base.Add(100 * time.Millisecond)) {
		t.Fatal("frame at +100ms should pass")
	}
	// Soon after the last pass: dropped.
	if rl.allow(base.Add(120 * time.Millisecond)) {
		t.Fatal("frame at +120ms should be dropped (last pass was +100ms)")
	}
	// Another full interval later: passes.
	if !rl.allow(base.Add(200 * time.Millisecond)) {
		t.Fatal("frame at +200ms should pass")
	}
}

// TestRateLimiterApproximatesRate feeds a dense stream of timestamps over one
// second and checks the delivered count is near the target.
func TestRateLimiterApproximatesRate(t *testing.T) {
	rl := newRateLimiter(20) // expect ~20 over 1s
	base := time.Unix(0, 0)

	delivered := 0
	for ms := 0; ms < 1000; ms++ { // a candidate frame every 1ms
		if rl.allow(base.Add(time.Duration(ms) * time.Millisecond)) {
			delivered++
		}
	}
	if delivered < 18 || delivered > 21 {
		t.Fatalf("delivered %d frames over 1s, want ~20", delivered)
	}
}
