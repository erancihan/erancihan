package dev.erancihan.justads.config

/**
 * Google's public **test** ad unit IDs. Safe to render, always fill, and carry zero
 * AdMob-account risk (PLAN.md §2, §5.4). The app ships wired to these; real IDs are a
 * deliberate, guarded switch in Settings on the real-ads path.
 */
object AdMobTestUnitIds {
    // Android
    const val ANDROID_APP_ID = "ca-app-pub-3940256099942544~3347511713"
    const val ANDROID_BANNER = "ca-app-pub-3940256099942544/6300978111"
    const val ANDROID_INTERSTITIAL = "ca-app-pub-3940256099942544/1033173712"
    const val ANDROID_REWARDED = "ca-app-pub-3940256099942544/5224354917"
    const val ANDROID_NATIVE = "ca-app-pub-3940256099942544/2247696110"

    // iOS
    const val IOS_APP_ID = "ca-app-pub-3940256099942544~1458002511"
    const val IOS_BANNER = "ca-app-pub-3940256099942544/2934735716"
    const val IOS_INTERSTITIAL = "ca-app-pub-3940256099942544/4411468910"
    const val IOS_REWARDED = "ca-app-pub-3940256099942544/1712485313"
    const val IOS_NATIVE = "ca-app-pub-3940256099942544/3986624511"
}

enum class AdPlatform { ANDROID, IOS }

/** The ad unit IDs and mode a running app instance uses. */
data class AdsConfig(
    val useTestAds: Boolean,
    val bannerUnitId: String,
    val interstitialUnitId: String,
    val rewardedUnitId: String,
    val nativeUnitId: String,
) {
    companion object {
        /** The default, safe configuration: Google's test units for the given platform. */
        fun test(platform: AdPlatform): AdsConfig = when (platform) {
            AdPlatform.ANDROID -> AdsConfig(
                useTestAds = true,
                bannerUnitId = AdMobTestUnitIds.ANDROID_BANNER,
                interstitialUnitId = AdMobTestUnitIds.ANDROID_INTERSTITIAL,
                rewardedUnitId = AdMobTestUnitIds.ANDROID_REWARDED,
                nativeUnitId = AdMobTestUnitIds.ANDROID_NATIVE,
            )
            AdPlatform.IOS -> AdsConfig(
                useTestAds = true,
                bannerUnitId = AdMobTestUnitIds.IOS_BANNER,
                interstitialUnitId = AdMobTestUnitIds.IOS_INTERSTITIAL,
                rewardedUnitId = AdMobTestUnitIds.IOS_REWARDED,
                nativeUnitId = AdMobTestUnitIds.IOS_NATIVE,
            )
        }
    }
}
