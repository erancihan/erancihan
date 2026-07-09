package dev.erancihan.justads.core.ads

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/** Outcome of the UMP consent flow (PLAN.md §6). */
enum class ConsentState {
    /** Consent form shown and a choice recorded. */
    OBTAINED,

    /** User is outside a region that requires a form (e.g. non-EEA). */
    NOT_REQUIRED,

    /** A form is required but has not yet been completed. */
    REQUIRED_UNOBTAINED,

    UNKNOWN,
}

/**
 * Manages user consent. Real impl wraps Google's UMP SDK (+ iOS ATT). The test-ads path
 * doesn't need consent at all, so [NoopConsentManager] is the default wiring until real
 * ad units are switched on.
 */
interface ConsentManager {
    val state: StateFlow<ConsentState>

    /** Run the consent flow if required. Returns the resolved state. */
    suspend fun ensureConsent(): ConsentState

    /** True once the SDK may request ads (consent obtained or not required). */
    val canRequestAds: Boolean

    /** Whether ads may be personalized given the recorded choice + ATT status. */
    val personalizationAllowed: Boolean

    /** Whether to show the "Manage consent" entry point in Settings. */
    val isPrivacyOptionsRequired: Boolean

    /** Re-present the UMP privacy-options form (from Settings). */
    fun showPrivacyOptions()
}

/**
 * Consent no-op for the test-ads build: ads are always allowed, never personalized.
 * Keeps the whole app runnable without any UMP/ATT wiring.
 */
class NoopConsentManager : ConsentManager {
    override val state: StateFlow<ConsentState> = MutableStateFlow(ConsentState.NOT_REQUIRED)
    override suspend fun ensureConsent(): ConsentState = ConsentState.NOT_REQUIRED
    override val canRequestAds: Boolean = true
    override val personalizationAllowed: Boolean = false
    override val isPrivacyOptionsRequired: Boolean = false
    override fun showPrivacyOptions() { /* no-op */ }
}
