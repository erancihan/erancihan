package dev.erancihan.justads.di

import dev.erancihan.justads.config.AdsConfig
import dev.erancihan.justads.core.ads.AdsController
import dev.erancihan.justads.core.ads.ConsentManager
import dev.erancihan.justads.core.data.AdHistoryDao

/**
 * The platform-provided seam. Android builds this in `MainActivity` with a `Context`;
 * iOS builds it in Swift and hands it to `MainViewController` (PLAN.md §5.3). The shared
 * UI depends only on this interface, never on platform types.
 */
interface AppDependencies {
    val config: AdsConfig
    val ads: AdsController
    val consent: ConsentManager
    val history: AdHistoryDao

    /** e.g. "Android 34" / "iOS 17.2" — shown on the About screen. */
    val platformLabel: String
}

/** Static build metadata shared by both platforms. */
object BuildInfo {
    const val VERSION = "0.1.0"
}
