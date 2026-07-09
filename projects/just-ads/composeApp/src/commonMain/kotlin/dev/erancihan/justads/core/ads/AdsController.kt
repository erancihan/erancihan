package dev.erancihan.justads.core.ads

import dev.erancihan.justads.core.model.AdRecord
import kotlinx.coroutines.flow.StateFlow

/** SDK lifecycle state, surfaced so the UI can gate the feed until ads can be requested. */
sealed interface AdsInitState {
    data object Idle : AdsInitState
    data object Initializing : AdsInitState
    data object Ready : AdsInitState
    data class Failed(val reason: String) : AdsInitState
}

/** Result of loading a full-screen (interstitial / rewarded) ad. */
sealed interface AdOutcome {
    data class Loaded(val record: AdRecord) : AdOutcome
    data class Failed(val reason: String) : AdOutcome
}

/**
 * Opaque handle to a loaded native ad. The platform impl also knows how to render it
 * ([dev.erancihan.justads.ui] `NativeAdCard`); core only needs its record and lifecycle.
 */
interface NativeAdHandle {
    val record: AdRecord
    /** Release the underlying platform ad. Must be called when the card leaves the feed. */
    fun destroy()
}

/** Result of loading a native ad — carries the render handle on success. */
sealed interface NativeAdOutcome {
    data class Loaded(val handle: NativeAdHandle) : NativeAdOutcome
    data class Failed(val reason: String) : NativeAdOutcome
}

/**
 * Platform-agnostic ads contract. Android implements it directly against the Google
 * Mobile Ads SDK; iOS delegates to a Swift implementation injected at startup
 * (PLAN.md §5.1, §5.3). One full-screen ad is in flight at a time.
 */
interface AdsController {
    val initState: StateFlow<AdsInitState>

    /** Initialize the SDK. Callers must gate this on consent (PLAN.md §6). Idempotent. */
    suspend fun initialize(personalized: Boolean)

    suspend fun loadInterstitial(): AdOutcome
    fun showInterstitial(onDismissed: () -> Unit)

    suspend fun loadRewarded(): AdOutcome
    fun showRewarded(onReward: (amount: Int) -> Unit, onDismissed: () -> Unit)

    suspend fun loadNativeAd(): NativeAdOutcome
}
