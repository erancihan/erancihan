package dev.erancihan.justads.core.model

import kotlinx.serialization.Serializable

/** The four AdMob formats this app can request and inspect. */
@Serializable
enum class AdFormat { BANNER, NATIVE, INTERSTITIAL, REWARDED }

/**
 * One adapter's attempt within a mediation waterfall — the story of who tried to
 * fill the request. Built from `AdapterResponseInfo` on each platform.
 */
@Serializable
data class AdapterAttempt(
    val adSourceName: String,
    val adSourceId: String? = null,
    val latencyMs: Long? = null,
    /** Null when this adapter is the one that filled; non-null describes why it didn't. */
    val error: String? = null,
) {
    val filled: Boolean get() = error == null
}

/** Native-ad creative assets, as the advertiser supplied them. */
@Serializable
data class NativeCreative(
    val advertiser: String? = null,
    val headline: String? = null,
    val body: String? = null,
    val callToAction: String? = null,
    val store: String? = null,
    val price: String? = null,
    val starRating: Double? = null,
    /** AdChoices "i" target — advertiser / opt-out info. */
    val adChoicesUrl: String? = null,
)

/**
 * The platform-agnostic record of a single loaded ad. Everything the UI inspects and
 * everything persisted to history is derived from this. Built by the platform
 * `AdsController` from the SDK's `ResponseInfo` + assets; see PLAN.md §5.5.
 */
@Serializable
data class AdRecord(
    /** `ResponseInfo.responseId`; may be blank if the SDK returned none. */
    val id: String,
    val format: AdFormat,
    /** Ad source that actually filled — e.g. "Google AdMob Network" or a mediated net. */
    val filledBy: String,
    /** Derived from consent/ATT state at request time, not a per-ad SDK field. */
    val personalized: Boolean,
    /** App-stamped: the SDK gives no load timestamp. Epoch milliseconds, UTC. */
    val loadedAtEpochMs: Long,
    val latencyMs: Long? = null,
    val waterfall: List<AdapterAttempt> = emptyList(),
    val creative: NativeCreative? = null,
    /** `ResponseInfo.toString()` — the raw "nerd view". */
    val rawResponseDump: String = "",
) {
    /** Best human label for grouping in stats: advertiser if present, else the network. */
    val advertiserLabel: String get() = creative?.advertiser?.takeIf { it.isNotBlank() } ?: filledBy
}
