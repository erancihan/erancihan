package dev.erancihan.justads.core.util

/**
 * Time source. Injected everywhere instead of calling a platform clock directly, so
 * the pure-logic tests are deterministic. Real impls live in the platform source sets.
 */
fun interface Clock {
    fun nowMs(): Long
}
