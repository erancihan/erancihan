package dev.erancihan.justads

import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.ui.window.ComposeUIViewController
import dev.erancihan.justads.ads.IosAdLoader
import dev.erancihan.justads.ads.LocalIosAdLoader
import dev.erancihan.justads.di.IosAppDependencies
import platform.UIKit.UIViewController

/**
 * iOS entry point. Swift builds an [IosAdLoader] (backed by the Google Mobile Ads SDK) and
 * passes it here; we assemble [IosAppDependencies] and host the shared [App] (PLAN.md §5.3).
 */
fun MainViewController(loader: IosAdLoader): UIViewController = ComposeUIViewController {
    val deps = remember { IosAppDependencies(loader) }
    CompositionLocalProvider(LocalIosAdLoader provides loader) {
        App(deps)
    }
}
