package dev.erancihan.justads.core.feed

import dev.erancihan.justads.core.ads.AdOutcome
import dev.erancihan.justads.core.ads.AdsController
import dev.erancihan.justads.core.ads.BackoffPolicy
import dev.erancihan.justads.core.ads.NativeAdHandle
import dev.erancihan.justads.core.ads.NativeAdOutcome
import dev.erancihan.justads.core.data.AdHistoryDao
import dev.erancihan.justads.core.model.AdRecord
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/** Live counts for the current session, shown in the Gallery header. */
data class SessionStats(
    val adsSeen: Int = 0,
    val advertisers: Int = 0,
    val networks: Int = 0,
)

/** One native-ad card in the feed. The record is read straight off the render handle. */
data class FeedCard(val handle: NativeAdHandle) {
    val record: AdRecord get() = handle.record
}

data class FeedUiState(
    val items: List<FeedCard> = emptyList(),
    val loading: Boolean = false,
    val error: String? = null,
    /** When the last load failed, how long the UI should wait before auto-retrying. */
    val nextRetryDelayMs: Long? = null,
    val adsWatched: Int = 0,
    val session: SessionStats = SessionStats(),
)

/**
 * Pure feed state machine (no Compose, no platform types). Drives the Gallery: paging
 * native ads, capturing each to history, session stats, full-screen orchestration, and
 * exponential backoff on no-fill. Methods are `suspend` so tests drive them
 * deterministically; the Compose ViewModel launches them in its scope.
 */
class FeedController(
    private val ads: AdsController,
    private val history: AdHistoryDao,
    private val backoff: BackoffPolicy = BackoffPolicy(),
) {
    private val _state = MutableStateFlow(FeedUiState())
    val state: StateFlow<FeedUiState> = _state.asStateFlow()

    private var consecutiveFailures = 0
    private val sessionRecords = mutableListOf<AdRecord>()

    /** Load one more native ad and append it, or record a backoff-scheduled failure. */
    suspend fun loadMore() {
        if (_state.value.loading) return
        _state.update { it.copy(loading = true, error = null, nextRetryDelayMs = null) }

        when (val outcome = ads.loadNativeAd()) {
            is NativeAdOutcome.Loaded -> {
                consecutiveFailures = 0
                capture(outcome.handle.record)
                _state.update {
                    it.copy(
                        items = it.items + FeedCard(outcome.handle),
                        loading = false,
                        session = sessionStats(),
                    )
                }
            }

            is NativeAdOutcome.Failed -> {
                consecutiveFailures++
                _state.update {
                    it.copy(
                        loading = false,
                        error = outcome.reason,
                        nextRetryDelayMs = backoff.delayForFailure(consecutiveFailures),
                    )
                }
            }
        }
    }

    /** Destroy current cards, reset the session, and load a fresh first ad. */
    suspend fun refresh() {
        _state.value.items.forEach { it.handle.destroy() }
        consecutiveFailures = 0
        sessionRecords.clear()
        _state.value = FeedUiState(adsWatched = _state.value.adsWatched)
        loadMore()
    }

    /** Remove a card that has scrolled out of range and release its native ad. */
    fun evict(card: FeedCard) {
        card.handle.destroy()
        _state.update { it.copy(items = it.items - card) }
    }

    /** Load a full-screen interstitial and capture it. Present with [presentInterstitial]. */
    suspend fun loadInterstitial(): AdOutcome = loadFullScreen(ads.loadInterstitial())

    fun presentInterstitial(onDismissed: () -> Unit) = ads.showInterstitial(onDismissed)

    /** Load a rewarded ad and capture it. Present with [presentRewarded]. */
    suspend fun loadRewarded(): AdOutcome = loadFullScreen(ads.loadRewarded())

    fun presentRewarded(onDismissed: () -> Unit) {
        ads.showRewarded(
            onReward = { _ -> _state.update { it.copy(adsWatched = it.adsWatched + 1) } },
            onDismissed = onDismissed,
        )
    }

    fun clearError() = _state.update { it.copy(error = null, nextRetryDelayMs = null) }

    private suspend fun loadFullScreen(outcome: AdOutcome): AdOutcome {
        if (outcome is AdOutcome.Loaded) {
            capture(outcome.record)
            _state.update { it.copy(session = sessionStats()) }
        }
        return outcome
    }

    private suspend fun capture(record: AdRecord) {
        history.insert(record)
        sessionRecords += record
    }

    private fun sessionStats(): SessionStats = SessionStats(
        adsSeen = sessionRecords.size,
        advertisers = sessionRecords
            .mapNotNull { it.creative?.advertiser?.takeIf(String::isNotBlank) }
            .toSet().size,
        networks = sessionRecords.map { it.filledBy }.toSet().size,
    )
}
