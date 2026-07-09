@file:OptIn(androidx.compose.ui.ExperimentalComposeUiApi::class)

package dev.erancihan.justads.ui.ads

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.interop.UIKitView
import dev.erancihan.justads.ads.IosNativeAdHandle
import dev.erancihan.justads.ads.LocalIosAdLoader
import dev.erancihan.justads.core.ads.NativeAdHandle
import platform.UIKit.UIView

@Composable
actual fun BannerAd(unitId: String, modifier: Modifier) {
    val loader = LocalIosAdLoader.current ?: return
    UIKitView(
        factory = { loader.makeBannerView(unitId) },
        modifier = modifier,
        update = { },
    )
}

@Composable
actual fun NativeAdMediaView(handle: NativeAdHandle, modifier: Modifier) {
    val ios = handle as? IosNativeAdHandle ?: return
    UIKitView<UIView>(
        factory = { ios.iosAd.makeView() },
        modifier = modifier,
        update = { },
    )
}
