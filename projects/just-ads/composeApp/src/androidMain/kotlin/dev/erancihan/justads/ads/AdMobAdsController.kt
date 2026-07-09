package dev.erancihan.justads.ads

import android.app.Activity
import android.content.Context
import android.os.Bundle
import com.google.ads.mediation.admob.AdMobAdapter
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdListener
import com.google.android.gms.ads.AdLoader
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.ResponseInfo
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import dev.erancihan.justads.config.AdsConfig
import dev.erancihan.justads.core.ads.AdOutcome
import dev.erancihan.justads.core.ads.AdsController
import dev.erancihan.justads.core.ads.AdsInitState
import dev.erancihan.justads.core.ads.NativeAdOutcome
import dev.erancihan.justads.core.model.AdFormat
import dev.erancihan.justads.core.model.AdRecord
import dev.erancihan.justads.core.model.AdapterAttempt
import dev.erancihan.justads.core.model.NativeCreative
import dev.erancihan.justads.core.util.Clock
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume
import com.google.android.gms.ads.nativead.NativeAd as GmsNativeAd

/**
 * Android [AdsController] over the Google Mobile Ads SDK. Load callbacks are bridged to
 * suspend functions; every loaded ad is turned into an [AdRecord] from its `ResponseInfo`
 * (PLAN.md §5.1, §5.5). Full-screen ads are shown against the current Activity.
 */
class AdMobAdsController(
    private val appContext: Context,
    private val config: AdsConfig,
    private val clock: Clock,
    private val activityProvider: () -> Activity?,
) : AdsController {

    override val initState = MutableStateFlow<AdsInitState>(AdsInitState.Idle)

    private var personalized: Boolean = false
    private var interstitial: InterstitialAd? = null
    private var rewarded: RewardedAd? = null

    override suspend fun initialize(personalized: Boolean) {
        this.personalized = personalized
        if (initState.value == AdsInitState.Ready) return
        initState.value = AdsInitState.Initializing
        withContext(Dispatchers.Main) {
            suspendCancellableCoroutine { cont ->
                MobileAds.initialize(appContext) { cont.resume(Unit) }
            }
        }
        initState.value = AdsInitState.Ready
    }

    private fun request(): AdRequest {
        val builder = AdRequest.Builder()
        if (!personalized) {
            val extras = Bundle().apply { putString("npa", "1") }
            builder.addNetworkExtrasBundle(AdMobAdapter::class.java, extras)
        }
        return builder.build()
    }

    override suspend fun loadInterstitial(): AdOutcome = withContext(Dispatchers.Main) {
        suspendCancellableCoroutine { cont ->
            InterstitialAd.load(
                appContext, config.interstitialUnitId, request(),
                object : InterstitialAdLoadCallback() {
                    override fun onAdLoaded(ad: InterstitialAd) {
                        interstitial = ad
                        cont.resume(AdOutcome.Loaded(record(ad.responseInfo, AdFormat.INTERSTITIAL, null)))
                    }

                    override fun onAdFailedToLoad(error: LoadAdError) {
                        interstitial = null
                        cont.resume(AdOutcome.Failed(error.message))
                    }
                },
            )
        }
    }

    override fun showInterstitial(onDismissed: () -> Unit) {
        val ad = interstitial
        val activity = activityProvider()
        if (ad == null || activity == null) { onDismissed(); return }
        ad.fullScreenContentCallback = dismissCallback { interstitial = null; onDismissed() }
        ad.show(activity)
    }

    override suspend fun loadRewarded(): AdOutcome = withContext(Dispatchers.Main) {
        suspendCancellableCoroutine { cont ->
            RewardedAd.load(
                appContext, config.rewardedUnitId, request(),
                object : RewardedAdLoadCallback() {
                    override fun onAdLoaded(ad: RewardedAd) {
                        rewarded = ad
                        cont.resume(AdOutcome.Loaded(record(ad.responseInfo, AdFormat.REWARDED, null)))
                    }

                    override fun onAdFailedToLoad(error: LoadAdError) {
                        rewarded = null
                        cont.resume(AdOutcome.Failed(error.message))
                    }
                },
            )
        }
    }

    override fun showRewarded(onReward: (amount: Int) -> Unit, onDismissed: () -> Unit) {
        val ad = rewarded
        val activity = activityProvider()
        if (ad == null || activity == null) { onDismissed(); return }
        ad.fullScreenContentCallback = dismissCallback { rewarded = null; onDismissed() }
        ad.show(activity) { rewardItem -> onReward(rewardItem.amount) }
    }

    override suspend fun loadNativeAd(): NativeAdOutcome = withContext(Dispatchers.Main) {
        suspendCancellableCoroutine { cont ->
            var resumed = false
            val loader = AdLoader.Builder(appContext, config.nativeUnitId)
                .forNativeAd { nativeAd: GmsNativeAd ->
                    if (resumed) { nativeAd.destroy(); return@forNativeAd }
                    resumed = true
                    val rec = record(nativeAd.responseInfo, AdFormat.NATIVE, nativeAd.toCreative())
                    cont.resume(NativeAdOutcome.Loaded(AndroidNativeAdHandle(nativeAd, rec)))
                }
                .withAdListener(object : AdListener() {
                    override fun onAdFailedToLoad(error: LoadAdError) {
                        if (resumed) return
                        resumed = true
                        cont.resume(NativeAdOutcome.Failed(error.message))
                    }
                })
                .build()
            loader.loadAd(request())
        }
    }

    private fun dismissCallback(onDismiss: () -> Unit) = object : FullScreenContentCallback() {
        override fun onAdDismissedFullScreenContent() = onDismiss()
        override fun onAdFailedToShowFullScreenContent(error: AdError) = onDismiss()
    }

    private fun record(responseInfo: ResponseInfo?, format: AdFormat, creative: NativeCreative?): AdRecord {
        val loaded = responseInfo?.loadedAdapterResponseInfo
        return AdRecord(
            id = responseInfo?.responseId.orEmpty(),
            format = format,
            filledBy = loaded?.adSourceName?.takeIf { it.isNotBlank() } ?: "Google AdMob Network",
            personalized = personalized,
            loadedAtEpochMs = clock.nowMs(),
            latencyMs = loaded?.latencyMillis,
            waterfall = responseInfo?.adapterResponses?.map {
                AdapterAttempt(
                    adSourceName = it.adSourceName,
                    adSourceId = it.adSourceId.takeIf(String::isNotBlank),
                    latencyMs = it.latencyMillis,
                    error = it.adError?.message,
                )
            } ?: emptyList(),
            creative = creative,
            rawResponseDump = responseInfo?.toString().orEmpty(),
        )
    }

    private fun GmsNativeAd.toCreative() = NativeCreative(
        advertiser = advertiser,
        headline = headline,
        body = body,
        callToAction = callToAction,
        store = store,
        price = price,
        starRating = starRating,
        adChoicesUrl = null, // AdChoices is rendered as an overlay by NativeAdView, not a URL
    )
}
