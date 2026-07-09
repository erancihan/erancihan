package dev.erancihan.justads.ui.ads

import android.content.Context
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.viewinterop.AndroidView
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.nativead.MediaView
import com.google.android.gms.ads.nativead.NativeAdView
import dev.erancihan.justads.ads.AndroidNativeAdHandle
import dev.erancihan.justads.core.ads.NativeAdHandle
import com.google.android.gms.ads.nativead.NativeAd as GmsNativeAd

@Composable
actual fun BannerAd(unitId: String, modifier: Modifier) {
    val configuration = LocalConfiguration.current
    AndroidView(
        modifier = modifier,
        factory = { ctx ->
            AdView(ctx).apply {
                adUnitId = unitId
                setAdSize(
                    AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(ctx, configuration.screenWidthDp),
                )
                loadAd(AdRequest.Builder().build())
            }
        },
        // Destroy the AdView (and its WebView) when the banner leaves composition — else it
        // leaks one WebView-backed AdView per tab switch.
        onRelease = { it.destroy() },
    )
}

@Composable
actual fun NativeAdMediaView(handle: NativeAdHandle, modifier: Modifier) {
    val android = handle as? AndroidNativeAdHandle ?: return
    AndroidView(
        modifier = modifier,
        factory = { ctx -> buildNativeAdView(ctx, android.nativeAd) },
    )
}

/** Builds a minimal but complete NativeAdView (media + headline + body + CTA) and binds assets. */
private fun buildNativeAdView(ctx: Context, ad: GmsNativeAd): NativeAdView {
    val nativeAdView = NativeAdView(ctx)
    val column = LinearLayout(ctx).apply {
        orientation = LinearLayout.VERTICAL
        layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
        )
    }

    val media = MediaView(ctx).apply {
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 480)
    }
    val headline = TextView(ctx).apply { textSize = 16f }
    val body = TextView(ctx).apply { textSize = 13f }
    val cta = Button(ctx)

    column.addView(media)
    column.addView(headline)
    ad.body?.let { body.text = it; column.addView(body) }
    ad.callToAction?.let { cta.text = it; column.addView(cta) }
    nativeAdView.addView(column)

    headline.text = ad.headline
    nativeAdView.headlineView = headline
    nativeAdView.bodyView = body
    nativeAdView.callToActionView = cta
    nativeAdView.mediaView = media
    ad.mediaContent?.let { media.mediaContent = it }

    nativeAdView.setNativeAd(ad)
    return nativeAdView
}
