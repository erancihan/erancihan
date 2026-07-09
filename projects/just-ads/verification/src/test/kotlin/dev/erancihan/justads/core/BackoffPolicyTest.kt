package dev.erancihan.justads.core

import dev.erancihan.justads.core.ads.BackoffPolicy
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class BackoffPolicyTest {
    @Test
    fun grows_exponentially_from_base() {
        val b = BackoffPolicy(baseMs = 2_000, maxMs = 5 * 60_000, factor = 2.0)
        assertEquals(2_000, b.delayForFailure(1))
        assertEquals(4_000, b.delayForFailure(2))
        assertEquals(8_000, b.delayForFailure(3))
        assertEquals(16_000, b.delayForFailure(4))
    }

    @Test
    fun saturates_at_max() {
        val b = BackoffPolicy(baseMs = 2_000, maxMs = 300_000, factor = 2.0)
        // 2000 * 2^n eventually exceeds max; must cap, never overflow.
        assertEquals(300_000, b.delayForFailure(50))
        assertTrue(b.delayForFailure(1000) == 300_000L)
    }

    @Test
    fun honors_custom_base_and_factor() {
        val b = BackoffPolicy(baseMs = 500, maxMs = 100_000, factor = 3.0)
        assertEquals(500, b.delayForFailure(1))
        assertEquals(1_500, b.delayForFailure(2))
        assertEquals(4_500, b.delayForFailure(3))
    }

    @Test
    fun rejects_invalid_arguments() {
        assertFailsWith<IllegalArgumentException> { BackoffPolicy(baseMs = 0) }
        assertFailsWith<IllegalArgumentException> { BackoffPolicy(baseMs = 10, maxMs = 5) }
        assertFailsWith<IllegalArgumentException> { BackoffPolicy(factor = 0.5) }
        assertFailsWith<IllegalArgumentException> { BackoffPolicy().delayForFailure(0) }
    }
}
