package dev.erancihan.justads.core

import dev.erancihan.justads.ui.format.formatEpochMsUtc
import dev.erancihan.justads.ui.format.formatLatency
import dev.erancihan.justads.ui.format.formatPercent
import kotlin.test.Test
import kotlin.test.assertEquals

class FormatTest {
    @Test
    fun unix_epoch_is_1970() {
        assertEquals("1970-01-01 00:00:00 UTC", formatEpochMsUtc(0L))
    }

    @Test
    fun known_instant_formats_correctly() {
        // 2023-11-14T22:13:20Z == 1_700_000_000_000 ms
        assertEquals("2023-11-14 22:13:20 UTC", formatEpochMsUtc(1_700_000_000_000L))
    }

    @Test
    fun handles_leap_day() {
        // 2024-02-29T12:00:00Z
        val ms = 1_709_208_000_000L
        assertEquals("2024-02-29 12:00:00 UTC", formatEpochMsUtc(ms))
    }

    @Test
    fun latency_and_percent_helpers() {
        assertEquals("187 ms", formatLatency(187))
        assertEquals("—", formatLatency(null))
        assertEquals("50%", formatPercent(0.5))
        assertEquals("0%", formatPercent(0.0))
        assertEquals("100%", formatPercent(1.0))
    }
}
