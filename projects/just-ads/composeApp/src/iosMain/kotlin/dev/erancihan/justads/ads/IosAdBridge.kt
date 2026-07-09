package dev.erancihan.justads.ads

import platform.UIKit.UIView

/**
 * Bridge interfaces implemented in Swift (PLAN.md §5.3). All async is callback-based to
 * stay Objective-C-friendly across the Kotlin/Native boundary; [IosAdsController] adapts
 * these into the core `AdsController` (suspend + StateFlow). Sentinels: latencyMs -1 =
 * unknown, starRating NaN = none.
 */
interface IosAdapterAttempt {
    val adSourceName: String
    val adSourceId: String?
    val latencyMs: Long
    val error: String?
}

/** Metadata common to every loaded iOS ad, from `GADResponseInfo`. */
interface IosAdMeta {
    val responseId: String
    val filledBy: String
    val latencyMs: Long
    val rawDump: String
    val waterfall: List<IosAdapterAttempt>
}

/** A loaded native ad: metadata + creative assets + a factory for its SDK-rendered view. */
interface IosNativeAd : IosAdMeta {
    val advertiser: String?
    val headline: String?
    val body: String?
    val callToAction: String?
    val store: String?
    val price: String?
    val starRating: Double
    val adChoicesUrl: String?
    fun makeView(): UIView
    fun destroy()
}

/** A loaded full-screen ad (interstitial / rewarded): metadata only; presented via the loader. */
interface IosLoadedAd : IosAdMeta

/** The Swift-implemented ad loader handed to `MainViewController` at startup. */
interface IosAdLoader {
    fun initialize(personalized: Boolean, completion: () -> Unit)
    fun loadNative(onLoaded: (IosNativeAd) -> Unit, onFailed: (String) -> Unit)
    fun loadInterstitial(onLoaded: (IosLoadedAd) -> Unit, onFailed: (String) -> Unit)
    fun showInterstitial(onDismissed: () -> Unit)
    fun loadRewarded(onLoaded: (IosLoadedAd) -> Unit, onFailed: (String) -> Unit)
    fun showRewarded(onReward: (Int) -> Unit, onDismissed: () -> Unit)
    fun makeBannerView(unitId: String): UIView
}
