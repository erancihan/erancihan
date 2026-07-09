package dev.erancihan.justads.ui

import androidx.compose.runtime.Composable

/**
 * Intercepts the platform back gesture/button. Android wires it to `activity.onBackPressed`
 * via `BackHandler`; iOS relies on the in-app back button, so its actual is a no-op.
 */
@Composable
expect fun PlatformBackHandler(enabled: Boolean, onBack: () -> Unit)
