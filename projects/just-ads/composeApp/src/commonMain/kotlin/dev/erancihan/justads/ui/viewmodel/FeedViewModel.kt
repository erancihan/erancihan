package dev.erancihan.justads.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dev.erancihan.justads.core.ads.AdOutcome
import dev.erancihan.justads.core.ads.AdsInitState
import dev.erancihan.justads.core.feed.FeedCard
import dev.erancihan.justads.core.feed.FeedController
import dev.erancihan.justads.di.AppDependencies
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch

/**
 * Compose-facing wrapper over the pure [FeedController]. Runs the consent → init → first
 * load sequence (gated on [canRequestAds] so real ads are never requested without consent),
 * launches controller actions in [viewModelScope], and drives *bounded* backoff-based
 * auto-retry on no-fill so the feed doesn't keep requesting ads forever off-screen.
 */
class FeedViewModel(private val deps: AppDependencies) : ViewModel() {
    private val controller = FeedController(deps.ads, deps.history)

    val state = controller.state
    val initState: StateFlow<AdsInitState> = deps.ads.initState

    // One-shot events (not conflated state) so identical, rapid messages aren't swallowed.
    private val _messages = MutableSharedFlow<String>(extraBufferCapacity = 8)
    val messages: SharedFlow<String> = _messages.asSharedFlow()

    private var retryJob: Job? = null
    private var autoRetries = 0

    init {
        viewModelScope.launch {
            deps.consent.ensureConsent()
            if (deps.consent.canRequestAds) {
                deps.ads.initialize(deps.consent.personalizationAllowed)
                controller.loadMore()
                scheduleRetryIfNeeded()
            } else {
                _messages.emit("Ads unavailable until consent is completed.")
            }
        }
    }

    /** User-initiated load ("Load more" / "Try now" / page-ahead): resets the retry budget. */
    fun loadMore() = viewModelScope.launch {
        autoRetries = 0
        retryJob?.cancel()
        controller.loadMore()
        scheduleRetryIfNeeded()
    }

    fun refresh() = viewModelScope.launch {
        autoRetries = 0
        retryJob?.cancel()
        controller.refresh()
        scheduleRetryIfNeeded()
    }

    fun evict(card: FeedCard) = controller.evict(card)

    fun requestInterstitial() = viewModelScope.launch {
        when (val outcome = controller.loadInterstitial()) {
            is AdOutcome.Loaded -> controller.presentInterstitial(onDismissed = {})
            is AdOutcome.Failed -> _messages.emit("Interstitial unavailable: ${outcome.reason}")
        }
    }

    fun requestRewarded() = viewModelScope.launch {
        when (val outcome = controller.loadRewarded()) {
            is AdOutcome.Loaded -> controller.presentRewarded(onDismissed = {})
            is AdOutcome.Failed -> _messages.emit("Rewarded unavailable: ${outcome.reason}")
        }
    }

    /**
     * If the last load failed, wait the controller's backoff delay then retry — but at most
     * [MAX_AUTO_RETRIES] times before giving up (the user can tap "Try now"). This bounds
     * background ad requests when the app is off-screen or persistently no-fill.
     */
    private fun scheduleRetryIfNeeded() {
        val wait = controller.state.value.nextRetryDelayMs ?: return
        if (autoRetries >= MAX_AUTO_RETRIES) return
        retryJob?.cancel()
        retryJob = viewModelScope.launch {
            delay(wait)
            autoRetries++
            controller.loadMore()
            scheduleRetryIfNeeded()
        }
    }

    override fun onCleared() {
        super.onCleared()
        retryJob?.cancel()
        controller.state.value.items.forEach { it.handle.destroy() }
    }

    private companion object {
        const val MAX_AUTO_RETRIES = 5
    }
}
