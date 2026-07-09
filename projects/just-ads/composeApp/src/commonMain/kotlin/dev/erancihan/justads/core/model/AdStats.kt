package dev.erancihan.justads.core.model

/** A labelled tally, used for "top advertisers" / "top networks" lists. */
data class LabelCount(val label: String, val count: Int)

/** Ads loaded on a single UTC day. */
data class DayCount(val epochDay: Long, val count: Int)

const val MS_PER_DAY: Long = 86_400_000L

/**
 * Aggregates a history of [AdRecord]s into the numbers the Stats screen shows.
 * Pure and deterministic — the unit tests pin every field.
 */
data class AdStats(
    val total: Int,
    val personalizedCount: Int,
    val distinctAdvertisers: Int,
    val distinctNetworks: Int,
    val byFormat: Map<AdFormat, Int>,
    val topAdvertisers: List<LabelCount>,
    val topNetworks: List<LabelCount>,
    val perDay: List<DayCount>,
) {
    val nonPersonalizedCount: Int get() = total - personalizedCount

    /** Fraction in [0,1]; 0 when there are no records (avoids divide-by-zero). */
    val personalizedRatio: Double get() = if (total == 0) 0.0 else personalizedCount.toDouble() / total

    companion object {
        val EMPTY = AdStats(0, 0, 0, 0, emptyMap(), emptyList(), emptyList(), emptyList())

        fun from(records: List<AdRecord>, topN: Int = 10): AdStats {
            if (records.isEmpty()) return EMPTY

            val advertisers = records.groupingBy { it.advertiserLabel }.eachCount()
            val networks = records.groupingBy { it.filledBy }.eachCount()

            // Distinct advertisers counts only records that actually carried an advertiser
            // asset, so an all-banner history doesn't inflate the number via the fallback.
            val distinctAdvertisers = records
                .mapNotNull { it.creative?.advertiser?.takeIf(String::isNotBlank) }
                .toSet().size

            return AdStats(
                total = records.size,
                personalizedCount = records.count { it.personalized },
                distinctAdvertisers = distinctAdvertisers,
                distinctNetworks = networks.keys.size,
                byFormat = records.groupingBy { it.format }.eachCount(),
                topAdvertisers = advertisers.toRanked(topN),
                topNetworks = networks.toRanked(topN),
                perDay = records
                    .groupingBy { it.loadedAtEpochMs / MS_PER_DAY }
                    .eachCount()
                    .map { (day, n) -> DayCount(day, n) }
                    .sortedBy { it.epochDay },
            )
        }

        /** Highest count first; ties broken alphabetically so ordering is stable. */
        private fun Map<String, Int>.toRanked(topN: Int): List<LabelCount> =
            entries.map { LabelCount(it.key, it.value) }
                .sortedWith(compareByDescending<LabelCount> { it.count }.thenBy { it.label })
                .take(topN)
    }
}
