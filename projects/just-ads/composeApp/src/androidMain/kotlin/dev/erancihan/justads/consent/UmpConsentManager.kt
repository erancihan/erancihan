package dev.erancihan.justads.consent

import android.app.Activity
import android.content.Context
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform
import dev.erancihan.justads.core.ads.ConsentManager
import dev.erancihan.justads.core.ads.ConsentState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * UMP-backed consent (real-ads path, PLAN.md §6). Runs requestConsentInfoUpdate then
 * loadAndShowConsentFormIfRequired; the SDK then applies the stored consent to ad requests.
 */
class UmpConsentManager(
    appContext: Context,
    private val activityProvider: () -> Activity?,
) : ConsentManager {

    private val info: ConsentInformation = UserMessagingPlatform.getConsentInformation(appContext)
    override val state = MutableStateFlow(ConsentState.UNKNOWN)

    override suspend fun ensureConsent(): ConsentState {
        val activity = activityProvider() ?: return ConsentState.UNKNOWN.also { state.value = it }
        val params = ConsentRequestParameters.Builder().build()

        suspendCancellableCoroutine { cont ->
            info.requestConsentInfoUpdate(activity, params, { cont.resume(Unit) }, { cont.resume(Unit) })
        }
        suspendCancellableCoroutine { cont ->
            UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity) { cont.resume(Unit) }
        }

        val resolved = when {
            info.canRequestAds() && info.consentStatus == ConsentInformation.ConsentStatus.OBTAINED -> ConsentState.OBTAINED
            info.canRequestAds() -> ConsentState.NOT_REQUIRED
            else -> ConsentState.REQUIRED_UNOBTAINED
        }
        state.value = resolved
        return resolved
    }

    override val canRequestAds: Boolean get() = info.canRequestAds()

    // The SDK reads the stored consent signal itself; if ads can be requested, let them be personalized.
    override val personalizationAllowed: Boolean get() = info.canRequestAds()

    override val isPrivacyOptionsRequired: Boolean
        get() = info.privacyOptionsRequirementStatus ==
            ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED

    override fun showPrivacyOptions() {
        val activity = activityProvider() ?: return
        UserMessagingPlatform.showPrivacyOptionsForm(activity) { }
    }
}
