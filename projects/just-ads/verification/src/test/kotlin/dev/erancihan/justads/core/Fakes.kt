package dev.erancihan.justads.core

import dev.erancihan.justads.core.ads.AdOutcome
import dev.erancihan.justads.core.ads.AdsController
import dev.erancihan.justads.core.ads.AdsInitState
import dev.erancihan.justads.core.ads.NativeAdHandle
import dev.erancihan.justads.core.ads.NativeAdOutcome
import dev.erancihan.justads.core.model.AdFormat
import dev.erancihan.justads.core.model.AdRecord
import dev.erancihan.justads.core.model.AdapterAttempt
import dev.erancihan.justads.core.model.NativeCreative
import kotlinx.coroutines.flow.MutableStateFlow

/** Convenience builder so tests read as data, not boilerplate. */
fun adRecord(
    id: String = "id",
    format: AdFormat = AdFormat.NATIVE,
    filledBy: String = "Google AdMob Network",
    personalized: Boolean = false,
    loadedAtEpochMs: Long = 0L,
    latencyMs: Long? = 42L,
    advertiser: String? = null,
    waterfall: List<AdapterAttempt> = emptyList(),
): AdRecord = AdRecord(
    id = id,
    format = format,
    filledBy = filledBy,
    personalized = personalized,
    loadedAtEpochMs = loadedAtEpochMs,
    latencyMs = latencyMs,
    waterfall = waterfall,
    creative = advertiser?.let { NativeCreative(advertiser = it, headline = "H") },
    rawResponseDump = "dump:$id",
)

class FakeNativeAdHandle(override val record: AdRecord) : NativeAdHandle {
    var destroyed = false
        private set

    override fun destroy() {
        destroyed = true
    }
}

/**
 * Scripted AdsController. Queue up outcomes; each load pops the next (or fails if the
 * queue is empty). Full-screen presentation invokes callbacks synchronously.
 */
class FakeAdsController : AdsController {
    override val initState = MutableStateFlow<AdsInitState>(AdsInitState.Idle)

    val nativeOutcomes = ArrayDeque<NativeAdOutcome>()
    val interstitialOutcomes = ArrayDeque<AdOutcome>()
    val rewardedOutcomes = ArrayDeque<AdOutcome>()

    var initializedPersonalized: Boolean? = null
    var interstitialShown = 0
    var rewardedShown = 0

    fun queueNative(handle: NativeAdHandle) = nativeOutcomes.addLast(NativeAdOutcome.Loaded(handle))
    fun queueNativeFailure(reason: String = "no-fill") =
        nativeOutcomes.addLast(NativeAdOutcome.Failed(reason))

    override suspend fun initialize(personalized: Boolean) {
        initializedPersonalized = personalized
        initState.value = AdsInitState.Ready
    }

    override suspend fun loadNativeAd(): NativeAdOutcome =
        nativeOutcomes.removeFirstOrNull() ?: NativeAdOutcome.Failed("queue empty")

    override suspend fun loadInterstitial(): AdOutcome =
        interstitialOutcomes.removeFirstOrNull() ?: AdOutcome.Failed("queue empty")

    override fun showInterstitial(onDismissed: () -> Unit) {
        interstitialShown++
        onDismissed()
    }

    override suspend fun loadRewarded(): AdOutcome =
        rewardedOutcomes.removeFirstOrNull() ?: AdOutcome.Failed("queue empty")

    override fun showRewarded(onReward: (amount: Int) -> Unit, onDismissed: () -> Unit) {
        rewardedShown++
        onReward(1)
        onDismissed()
    }
}
