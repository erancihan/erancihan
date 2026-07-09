package dev.erancihan.justads.ads

import androidx.compose.runtime.staticCompositionLocalOf
import dev.erancihan.justads.core.ads.NativeAdHandle
import dev.erancihan.justads.core.model.AdRecord

/** Wraps a Swift [IosNativeAd] so the feed can render (via [IosNativeAd.makeView]) and destroy it. */
class IosNativeAdHandle(
    val iosAd: IosNativeAd,
    override val record: AdRecord,
) : NativeAdHandle {
    override fun destroy() = iosAd.destroy()
}

/** Exposes the Swift loader to the iOS `actual` composables (banner needs it). */
val LocalIosAdLoader = staticCompositionLocalOf<IosAdLoader?> { null }
