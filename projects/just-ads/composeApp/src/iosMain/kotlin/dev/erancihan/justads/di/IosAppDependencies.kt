package dev.erancihan.justads.di

import dev.erancihan.justads.ads.IosAdLoader
import dev.erancihan.justads.ads.IosAdsController
import dev.erancihan.justads.config.AdPlatform
import dev.erancihan.justads.config.AdsConfig
import dev.erancihan.justads.core.ads.AdsController
import dev.erancihan.justads.core.ads.ConsentManager
import dev.erancihan.justads.core.ads.NoopConsentManager
import dev.erancihan.justads.core.data.AdHistoryDao
import dev.erancihan.justads.core.util.Clock
import dev.erancihan.justads.data.SqlDelightAdHistoryDao
import dev.erancihan.justads.data.createJustAdsDb
import platform.Foundation.NSDate
import platform.UIKit.UIDevice

/** Assembles the iOS implementations behind [AppDependencies], given the Swift ad loader. */
class IosAppDependencies(loader: IosAdLoader) : AppDependencies {
    override val config: AdsConfig = AdsConfig.test(AdPlatform.IOS)

    private val clock = Clock { (NSDate().timeIntervalSince1970 * 1000.0).toLong() }

    override val ads: AdsController = IosAdsController(loader, clock)

    // Real-ads path would use a Swift-backed UMP + ATT manager here.
    override val consent: ConsentManager = NoopConsentManager()

    override val history: AdHistoryDao = SqlDelightAdHistoryDao(createJustAdsDb())

    override val platformLabel: String = "iOS ${UIDevice.currentDevice.systemVersion}"
}
