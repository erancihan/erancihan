package dev.erancihan.justads.ui.ads

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import dev.erancihan.justads.core.ads.NativeAdHandle

/**
 * Renders an anchored adaptive banner. Android hosts an `AdView` via `AndroidView`;
 * iOS hosts a `GADBannerView` via `UIKitView` (PLAN.md §5.2).
 */
@Composable
expect fun BannerAd(unitId: String, modifier: Modifier)

/**
 * Renders the native ad wrapped by [handle] using the platform's native-ad view so that
 * clicks, impressions, and AdChoices are wired by the SDK — Compose only frames it.
 */
@Composable
expect fun NativeAdMediaView(handle: NativeAdHandle, modifier: Modifier)
