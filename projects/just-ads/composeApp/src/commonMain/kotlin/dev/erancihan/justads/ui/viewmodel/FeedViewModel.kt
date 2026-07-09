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
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Compose-facing wrapper over the pure [FeedController]. Runs the consent → init → first
 * load sequence, launches controller actions in [viewModelScope], and drives backoff-based
 * auto-retry on no-fill (the controller computes the delay; the VM schedules it).
 */
class FeedViewModel(private val deps: AppDependencies) : ViewModel() {
    private val controller = FeedController(deps.ads, deps.history)

    val state = controller.state
    val initState: StateFlow<AdsInitState> = deps.ads.initState

    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message.asStateFlow()

    private var retryJob: Job? = null

    init {
        viewModelScope.launch {
            deps.consent.ensureConsent()
            deps.ads.initialize(deps.consent.personalizationAllowed)
            controller.loadMore()
            scheduleRetryIfNeeded()
        }
    }

    fun loadMore() = viewModelScope.launch {
        controller.loadMore()
        scheduleRetryIfNeeded()
    }

    fun refresh() = viewModelScope.launch {
        retryJob?.cancel()
        controller.refresh()
        scheduleRetryIfNeeded()
    }

    fun evict(card: FeedCard) = controller.evict(card)

    fun requestInterstitial() = viewModelScope.launch {
        when (val outcome = controller.loadInterstitial()) {
            is AdOutcome.Loaded -> controller.presentInterstitial(onDismissed = {})
            is AdOutcome.Failed -> _message.value = "Interstitial unavailable: ${outcome.reason}"
        }
    }

    fun requestRewarded() = viewModelScope.launch {
        when (val outcome = controller.loadRewarded()) {
            is AdOutcome.Loaded -> controller.presentRewarded(onDismissed = {})
            is AdOutcome.Failed -> _message.value = "Rewarded unavailable: ${outcome.reason}"
        }
    }

    fun consumeMessage() { _message.value = null }

    /** If the last load failed, wait the controller's backoff delay then retry once. */
    private fun scheduleRetryIfNeeded() {
        val wait = controller.state.value.nextRetryDelayMs ?: return
        retryJob?.cancel()
        retryJob = viewModelScope.launch {
            delay(wait)
            controller.loadMore()
            scheduleRetryIfNeeded()
        }
    }

    override fun onCleared() {
        retryJob?.cancel()
        controller.state.value.items.forEach { it.handle.destroy() }
    }
}
