package dev.erancihan.justads.ads

import dev.erancihan.justads.core.ads.NativeAdHandle
import dev.erancihan.justads.core.model.AdRecord
import com.google.android.gms.ads.nativead.NativeAd as GmsNativeAd

/** Wraps a loaded [GmsNativeAd] so the feed can render and lifecycle-manage it. */
class AndroidNativeAdHandle(
    val nativeAd: GmsNativeAd,
    override val record: AdRecord,
) : NativeAdHandle {
    override fun destroy() = nativeAd.destroy()
}
