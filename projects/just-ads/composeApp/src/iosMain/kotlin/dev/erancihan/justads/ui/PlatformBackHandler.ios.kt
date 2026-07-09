package dev.erancihan.justads.ui

import androidx.compose.runtime.Composable

/** iOS uses the in-app top-bar back button and system edge-swipe; no interception needed. */
@Composable
actual fun PlatformBackHandler(enabled: Boolean, onBack: () -> Unit) {
    // no-op
}
