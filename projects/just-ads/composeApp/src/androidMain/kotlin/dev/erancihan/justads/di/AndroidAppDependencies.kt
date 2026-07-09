package dev.erancihan.justads.di

import android.app.Activity
import android.content.Context
import android.os.Build
import dev.erancihan.justads.ads.AdMobAdsController
import dev.erancihan.justads.config.AdPlatform
import dev.erancihan.justads.config.AdsConfig
import dev.erancihan.justads.consent.UmpConsentManager
import dev.erancihan.justads.core.ads.AdsController
import dev.erancihan.justads.core.ads.ConsentManager
import dev.erancihan.justads.core.ads.NoopConsentManager
import dev.erancihan.justads.core.data.AdHistoryDao
import dev.erancihan.justads.core.util.Clock
import dev.erancihan.justads.data.SqlDelightAdHistoryDao
import dev.erancihan.justads.data.createJustAdsDb

/** Assembles the Android implementations behind [AppDependencies]. Built once in the Application. */
class AndroidAppDependencies(
    appContext: Context,
    activityProvider: () -> Activity?,
) : AppDependencies {
    override val config: AdsConfig = AdsConfig.test(AdPlatform.ANDROID)

    private val clock = Clock { System.currentTimeMillis() }

    override val ads: AdsController = AdMobAdsController(appContext, config, clock, activityProvider)

    override val consent: ConsentManager =
        if (config.useTestAds) NoopConsentManager() else UmpConsentManager(appContext, activityProvider)

    override val history: AdHistoryDao = SqlDelightAdHistoryDao(createJustAdsDb(appContext))

    override val platformLabel: String = "Android ${Build.VERSION.RELEASE}"
}
