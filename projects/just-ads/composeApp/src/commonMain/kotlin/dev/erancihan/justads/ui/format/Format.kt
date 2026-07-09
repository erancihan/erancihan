package dev.erancihan.justads.ui.format

import dev.erancihan.justads.core.model.MS_PER_DAY

/**
 * Format an epoch-millis instant as "YYYY-MM-DD HH:MM:SS UTC" without a datetime library
 * (keeps commonMain dependency-free). UTC is intentional and labelled — this is a
 * transparency tool, not a calendar. Uses Howard Hinnant's days→civil algorithm.
 */
fun formatEpochMsUtc(ms: Long): String {
    val days = ms.floorDiv(MS_PER_DAY)   // kotlin stdlib, multiplatform-safe
    val msOfDay = ms.mod(MS_PER_DAY)     // floored modulo -> always non-negative

    val (y, m, d) = civilFromDays(days)
    val secOfDay = msOfDay / 1000
    val hh = secOfDay / 3600
    val mm = (secOfDay % 3600) / 60
    val ss = secOfDay % 60

    return "${y.pad(4)}-${m.pad(2)}-${d.pad(2)} ${hh.pad(2)}:${mm.pad(2)}:${ss.pad(2)} UTC"
}

/** (year, month[1-12], day[1-31]) for a count of days since the Unix epoch. */
private fun civilFromDays(days: Long): Triple<Long, Long, Long> {
    val z = days + 719468
    val era = (if (z >= 0) z else z - 146096) / 146097
    val doe = z - era * 146097
    val yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365
    val y = yoe + era * 400
    val doy = doe - (365 * yoe + yoe / 4 - yoe / 100)
    val mp = (5 * doy + 2) / 153
    val d = doy - (153 * mp + 2) / 5 + 1
    val m = if (mp < 10) mp + 3 else mp - 9
    return Triple(if (m <= 2) y + 1 else y, m, d)
}

private fun Long.pad(width: Int): String = toString().padStart(width, '0')

/** e.g. 187 -> "187 ms", null -> "—". */
fun formatLatency(ms: Long?): String = ms?.let { "$it ms" } ?: "—"

/** Fraction in [0,1] as a whole-number percentage, e.g. 0.5 -> "50%". */
fun formatPercent(fraction: Double): String = "${(fraction * 100).toInt()}%"
