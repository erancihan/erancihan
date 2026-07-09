package dev.erancihan.justads.ads

import dev.erancihan.justads.core.ads.AdOutcome
import dev.erancihan.justads.core.ads.AdsController
import dev.erancihan.justads.core.ads.AdsInitState
import dev.erancihan.justads.core.ads.NativeAdOutcome
import dev.erancihan.justads.core.model.AdFormat
import dev.erancihan.justads.core.model.AdRecord
import dev.erancihan.justads.core.model.AdapterAttempt
import dev.erancihan.justads.core.model.NativeCreative
import dev.erancihan.justads.core.util.Clock
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/** iOS [AdsController] adapting the Swift [IosAdLoader] into the core contract. */
class IosAdsController(
    private val loader: IosAdLoader,
    private val clock: Clock,
) : AdsController {

    override val initState = MutableStateFlow<AdsInitState>(AdsInitState.Idle)
    private var personalized = false

    override suspend fun initialize(personalized: Boolean) {
        this.personalized = personalized
        if (initState.value == AdsInitState.Ready) return
        initState.value = AdsInitState.Initializing
        suspendCancellableCoroutine { cont -> loader.initialize(personalized) { cont.resume(Unit) } }
        initState.value = AdsInitState.Ready
    }

    override suspend fun loadInterstitial(): AdOutcome = suspendCancellableCoroutine { cont ->
        loader.loadInterstitial(
            onLoaded = { cont.resume(AdOutcome.Loaded(it.toRecord(AdFormat.INTERSTITIAL))) },
            onFailed = { cont.resume(AdOutcome.Failed(it)) },
        )
    }

    override fun showInterstitial(onDismissed: () -> Unit) = loader.showInterstitial(onDismissed)

    override suspend fun loadRewarded(): AdOutcome = suspendCancellableCoroutine { cont ->
        loader.loadRewarded(
            onLoaded = { cont.resume(AdOutcome.Loaded(it.toRecord(AdFormat.REWARDED))) },
            onFailed = { cont.resume(AdOutcome.Failed(it)) },
        )
    }

    override fun showRewarded(onReward: (amount: Int) -> Unit, onDismissed: () -> Unit) =
        loader.showRewarded(onReward, onDismissed)

    override suspend fun loadNativeAd(): NativeAdOutcome = suspendCancellableCoroutine { cont ->
        loader.loadNative(
            onLoaded = { native ->
                val record = native.toRecord(AdFormat.NATIVE, native.toCreative())
                cont.resume(NativeAdOutcome.Loaded(IosNativeAdHandle(native, record)))
            },
            onFailed = { cont.resume(NativeAdOutcome.Failed(it)) },
        )
    }

    private fun IosAdMeta.toRecord(format: AdFormat, creative: NativeCreative? = null) = AdRecord(
        id = responseId,
        format = format,
        filledBy = filledBy,
        personalized = personalized,
        loadedAtEpochMs = clock.nowMs(),
        latencyMs = latencyMs.takeIf { it >= 0 },
        waterfall = waterfall.map {
            AdapterAttempt(it.adSourceName, it.adSourceId, it.latencyMs.takeIf { l -> l >= 0 }, it.error)
        },
        creative = creative,
        rawResponseDump = rawDump,
    )

    private fun IosNativeAd.toCreative() = NativeCreative(
        advertiser = advertiser,
        headline = headline,
        body = body,
        callToAction = callToAction,
        store = store,
        price = price,
        starRating = starRating.takeUnless { it.isNaN() },
        adChoicesUrl = adChoicesUrl,
    )
}
