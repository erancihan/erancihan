package transport

import "time"

// rateLimiter throttles a stream to at most a target frames-per-second by
// dropping frames that arrive too soon after the last delivered one. A target of
// 0 means unlimited (every frame passes). Time is injected via allow so the
// behaviour is deterministically testable.
type rateLimiter struct {
	interval time.Duration
	last     time.Time
	primed   bool
}

// newRateLimiter builds a limiter for the requested frames per second.
func newRateLimiter(maxFPS uint32) rateLimiter {
	if maxFPS == 0 {
		return rateLimiter{}
	}
	return rateLimiter{interval: time.Second / time.Duration(maxFPS)}
}

// allow reports whether a frame at time now should be delivered. The first frame
// always passes; subsequent frames pass only once interval has elapsed.
func (r *rateLimiter) allow(now time.Time) bool {
	if r.interval == 0 {
		return true
	}
	if !r.primed || now.Sub(r.last) >= r.interval {
		r.last = now
		r.primed = true
		return true
	}
	return false
}
