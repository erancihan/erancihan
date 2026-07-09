package dev.erancihan.justads.core

import dev.erancihan.justads.core.model.AdFormat
import dev.erancihan.justads.core.model.AdStats
import dev.erancihan.justads.core.model.MS_PER_DAY
import kotlin.test.Test
import kotlin.test.assertEquals

class AdStatsTest {
    @Test
    fun empty_history_is_EMPTY() {
        assertEquals(AdStats.EMPTY, AdStats.from(emptyList()))
        assertEquals(0.0, AdStats.from(emptyList()).personalizedRatio)
    }

    @Test
    fun counts_totals_and_personalization() {
        val stats = AdStats.from(
            listOf(
                adRecord(id = "a", personalized = true),
                adRecord(id = "b", personalized = true),
                adRecord(id = "c", personalized = false),
                adRecord(id = "d", personalized = false),
            )
        )
        assertEquals(4, stats.total)
        assertEquals(2, stats.personalizedCount)
        assertEquals(2, stats.nonPersonalizedCount)
        assertEquals(0.5, stats.personalizedRatio)
    }

    @Test
    fun distinct_advertisers_ignores_records_without_advertiser() {
        val stats = AdStats.from(
            listOf(
                adRecord(id = "a", advertiser = "Acme"),
                adRecord(id = "b", advertiser = "Acme"),
                adRecord(id = "c", advertiser = "Globex"),
                adRecord(id = "d", advertiser = null), // banner-like, no advertiser asset
            )
        )
        assertEquals(2, stats.distinctAdvertisers)
    }

    @Test
    fun distinct_networks_uses_filledBy() {
        val stats = AdStats.from(
            listOf(
                adRecord(id = "a", filledBy = "AdMob"),
                adRecord(id = "b", filledBy = "AppLovin"),
                adRecord(id = "c", filledBy = "AppLovin"),
            )
        )
        assertEquals(2, stats.distinctNetworks)
    }

    @Test
    fun byFormat_tallies_each_format() {
        val stats = AdStats.from(
            listOf(
                adRecord(id = "a", format = AdFormat.NATIVE),
                adRecord(id = "b", format = AdFormat.NATIVE),
                adRecord(id = "c", format = AdFormat.INTERSTITIAL),
                adRecord(id = "d", format = AdFormat.REWARDED),
            )
        )
        assertEquals(2, stats.byFormat[AdFormat.NATIVE])
        assertEquals(1, stats.byFormat[AdFormat.INTERSTITIAL])
        assertEquals(1, stats.byFormat[AdFormat.REWARDED])
        assertEquals(null, stats.byFormat[AdFormat.BANNER])
    }

    @Test
    fun top_advertisers_ranked_by_count_then_alphabetically() {
        val stats = AdStats.from(
            listOf(
                adRecord(id = "1", advertiser = "Globex"),
                adRecord(id = "2", advertiser = "Globex"),
                adRecord(id = "3", advertiser = "Globex"),
                adRecord(id = "4", advertiser = "Acme"),
                adRecord(id = "5", advertiser = "Acme"),
                adRecord(id = "6", advertiser = "Wayne"), // ties with... nothing; count 1
            ),
            topN = 2,
        )
        assertEquals(2, stats.topAdvertisers.size)
        assertEquals("Globex", stats.topAdvertisers[0].label)
        assertEquals(3, stats.topAdvertisers[0].count)
        assertEquals("Acme", stats.topAdvertisers[1].label)
        assertEquals(2, stats.topAdvertisers[1].count)
    }

    @Test
    fun tie_break_is_alphabetical() {
        val stats = AdStats.from(
            listOf(
                adRecord(id = "1", advertiser = "Zeta"),
                adRecord(id = "2", advertiser = "Alpha"),
            )
        )
        // Both count 1 → alphabetical: Alpha before Zeta.
        assertEquals(listOf("Alpha", "Zeta"), stats.topAdvertisers.map { it.label })
    }

    @Test
    fun perDay_buckets_by_utc_day_and_sorts() {
        val day0 = 10L * MS_PER_DAY
        val day1 = 11L * MS_PER_DAY
        val stats = AdStats.from(
            listOf(
                adRecord(id = "a", loadedAtEpochMs = day1 + 100),
                adRecord(id = "b", loadedAtEpochMs = day0 + 5),
                adRecord(id = "c", loadedAtEpochMs = day0 + 999),
            )
        )
        assertEquals(2, stats.perDay.size)
        assertEquals(10L, stats.perDay[0].epochDay)
        assertEquals(2, stats.perDay[0].count)
        assertEquals(11L, stats.perDay[1].epochDay)
        assertEquals(1, stats.perDay[1].count)
    }
}
