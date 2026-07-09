package dev.erancihan.justads.core.ads

/**
 * Exponential backoff for ad-load retries. Never hot-loops ad requests — rapid repeat
 * requests read as invalid traffic (PLAN.md §2, §5.1). [delayForFailure] is called with
 * the count of *consecutive* failures so far (1 = first failure).
 */
class BackoffPolicy(
    private val baseMs: Long = 2_000L,
    private val maxMs: Long = 5 * 60_000L,
    private val factor: Double = 2.0,
) {
    init {
        require(baseMs > 0) { "baseMs must be > 0" }
        require(maxMs >= baseMs) { "maxMs must be >= baseMs" }
        require(factor >= 1.0) { "factor must be >= 1.0" }
    }

    /** Delay before the next attempt, given [consecutiveFailures] (>= 1), capped at [maxMs]. */
    fun delayForFailure(consecutiveFailures: Int): Long {
        require(consecutiveFailures >= 1) { "consecutiveFailures must be >= 1" }
        // base * factor^(n-1), computed so large n saturates to maxMs without overflow.
        var delay = baseMs.toDouble()
        repeat(consecutiveFailures - 1) {
            delay *= factor
            if (delay >= maxMs) return maxMs
        }
        return delay.toLong().coerceIn(baseMs, maxMs)
    }
}
