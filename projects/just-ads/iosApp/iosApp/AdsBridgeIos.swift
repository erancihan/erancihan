import Foundation
import UIKit
import GoogleMobileAds
import ComposeApp

// Swift implementation of the Kotlin `IosAdLoader` bridge (PLAN.md §5.3).
//
// NOTE: written against the GAD-prefixed Google Mobile Ads API (SDK 11.x). SDK 12.x dropped
// the `GAD` prefix (e.g. `BannerView`, `InterstitialAd`, `Request`) — adjust the type names
// to match whichever version you pin via SPM. Everything below must be verified on device;
// it cannot be compiled in the planning environment.

private let testUnits = (
    banner: "ca-app-pub-3940256099942544/2934735716",
    interstitial: "ca-app-pub-3940256099942544/4411468910",
    rewarded: "ca-app-pub-3940256099942544/1712485313",
    native: "ca-app-pub-3940256099942544/3986624511"
)

final class AdsBridgeIos: NSObject, IosAdLoader {

    // Each in-flight native load is retained here (delegate strongly holds its own GADAdLoader);
    // removed on completion. A single shared slot would let a second load dealloc the first
    // loader mid-flight (its delegate is weak) and strand the first Kotlin continuation forever.
    private var activeNativeLoads = Set<NativeDelegate>()

    private var interstitial: GADInterstitialAd?
    private var rewarded: GADRewardedAd?

    func initialize(personalized: Bool, completion: @escaping () -> Void) {
        GADMobileAds.sharedInstance().start { _ in completion() }
    }

    private func request() -> GADRequest {
        let request = GADRequest()
        // Non-personalized: npa=1 extra (real-ads path; test ads ignore it).
        // let extras = GADExtras(); extras.additionalParameters = ["npa": "1"]; request.register(extras)
        return request
    }

    // MARK: Native

    func loadNative(onLoaded: @escaping (IosNativeAd) -> Void, onFailed: @escaping (String) -> Void) {
        let delegate = NativeDelegate(onLoaded: onLoaded, onFailed: onFailed)
        delegate.onFinish = { [weak self, weak delegate] in
            if let d = delegate { self?.activeNativeLoads.remove(d) }
        }
        let loader = GADAdLoader(
            adUnitID: testUnits.native,
            rootViewController: Self.topViewController(),
            adTypes: [.native],
            options: nil
        )
        loader.delegate = delegate
        delegate.loader = loader          // delegate strongly retains its loader
        activeNativeLoads.insert(delegate) // bridge strongly retains the delegate until done
        loader.load(request())
    }

    // MARK: Interstitial

    func loadInterstitial(onLoaded: @escaping (IosLoadedAd) -> Void, onFailed: @escaping (String) -> Void) {
        GADInterstitialAd.load(withAdUnitID: testUnits.interstitial, request: request()) { [weak self] ad, error in
            if let error = error { onFailed(error.localizedDescription); return }
            guard let ad = ad else { onFailed("no ad"); return }
            self?.interstitial = ad
            onLoaded(LoadedAdMeta(responseInfo: ad.responseInfo))
        }
    }

    func showInterstitial(onDismissed: @escaping () -> Void) {
        guard let ad = interstitial, let vc = Self.topViewController() else { onDismissed(); return }
        let d = FullScreenDelegate { [weak self] in self?.interstitial = nil; onDismissed() }
        ad.fullScreenContentDelegate = d
        objc_setAssociatedObject(ad, "d", d, .OBJC_ASSOCIATION_RETAIN)
        ad.present(fromRootViewController: vc)
    }

    // MARK: Rewarded

    func loadRewarded(onLoaded: @escaping (IosLoadedAd) -> Void, onFailed: @escaping (String) -> Void) {
        GADRewardedAd.load(withAdUnitID: testUnits.rewarded, request: request()) { [weak self] ad, error in
            if let error = error { onFailed(error.localizedDescription); return }
            guard let ad = ad else { onFailed("no ad"); return }
            self?.rewarded = ad
            onLoaded(LoadedAdMeta(responseInfo: ad.responseInfo))
        }
    }

    func showRewarded(onReward: @escaping (Int32) -> Void, onDismissed: @escaping () -> Void) {
        guard let ad = rewarded, let vc = Self.topViewController() else { onDismissed(); return }
        let d = FullScreenDelegate { [weak self] in self?.rewarded = nil; onDismissed() }
        ad.fullScreenContentDelegate = d
        objc_setAssociatedObject(ad, "d", d, .OBJC_ASSOCIATION_RETAIN)
        ad.present(fromRootViewController: vc) {
            let amount = ad.adReward.amount.intValue
            onReward(Int32(amount))
        }
    }

    // MARK: Banner

    func makeBannerView(unitId: String) -> UIView {
        let width = UIScreen.main.bounds.width
        let banner = GADBannerView(adSize: GADCurrentOrientationAnchoredAdaptiveBannerAdSizeWithWidth(width))
        banner.adUnitID = unitId
        banner.rootViewController = Self.topViewController()
        banner.load(request())
        return banner
    }

    static func topViewController() -> UIViewController? {
        let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene
        var top = scene?.keyWindow?.rootViewController
        while let presented = top?.presentedViewController { top = presented }
        return top
    }
}

// MARK: - Delegates

private final class NativeDelegate: NSObject, GADNativeAdLoaderDelegate {
    let onLoaded: (IosNativeAd) -> Void
    let onFailed: (String) -> Void
    var loader: GADAdLoader?       // strong ref keeps the loader alive for the whole load
    var onFinish: (() -> Void)?

    init(onLoaded: @escaping (IosNativeAd) -> Void, onFailed: @escaping (String) -> Void) {
        self.onLoaded = onLoaded; self.onFailed = onFailed
    }

    func adLoader(_ adLoader: GADAdLoader, didReceive nativeAd: GADNativeAd) {
        onLoaded(NativeAdImpl(ad: nativeAd)); finish()
    }

    func adLoader(_ adLoader: GADAdLoader, didFailToReceiveAdWithError error: Error) {
        onFailed(error.localizedDescription); finish()
    }

    private func finish() {
        loader = nil
        onFinish?()
    }
}

private final class FullScreenDelegate: NSObject, GADFullScreenContentDelegate {
    let onDismiss: () -> Void
    init(onDismiss: @escaping () -> Void) { self.onDismiss = onDismiss }
    func adDidDismissFullScreenContent(_ ad: GADFullScreenPresentingAd) { onDismiss() }
    func ad(_ ad: GADFullScreenPresentingAd, didFailToPresentFullScreenContentWithError error: Error) { onDismiss() }
}

// MARK: - Metadata helpers

/// Loaded adapter latency in ms, or -1 (unknown) if there is no loaded adapter info.
private func latencyMs(_ info: GADAdNetworkResponseInfo?) -> Int64 {
    guard let info = info else { return -1 }
    return Int64(info.latency * 1000)
}

private func attempts(from responseInfo: GADResponseInfo?) -> [IosAdapterAttempt] {
    (responseInfo?.adNetworkInfoArray ?? []).map { info in
        AdapterAttemptImpl(
            adSourceName: info.adSourceName ?? info.adNetworkClassName ?? "unknown",
            adSourceId: info.adSourceID,
            latencyMs: Int64(info.latency * 1000),
            error: info.error?.localizedDescription
        )
    }
}

// MARK: - Bridge value types (conform to the Kotlin protocols)

private final class AdapterAttemptImpl: IosAdapterAttempt {
    let adSourceName: String
    let adSourceId: String?
    let latencyMs: Int64
    let error: String?
    init(adSourceName: String, adSourceId: String?, latencyMs: Int64, error: String?) {
        self.adSourceName = adSourceName; self.adSourceId = adSourceId
        self.latencyMs = latencyMs; self.error = error
    }
}

private final class LoadedAdMeta: NSObject, IosLoadedAd {
    let responseId: String
    let filledBy: String
    let latencyMs: Int64
    let rawDump: String
    let waterfall: [IosAdapterAttempt]
    init(responseInfo: GADResponseInfo?) {
        self.responseId = responseInfo?.responseIdentifier ?? ""
        let loaded = responseInfo?.loadedAdNetworkResponseInfo
        self.filledBy = loaded?.adSourceName ?? loaded?.adNetworkClassName ?? "Google AdMob Network"
        self.latencyMs = latencyMs(loaded)
        self.rawDump = responseInfo?.description ?? ""
        self.waterfall = attempts(from: responseInfo)
    }
}

private final class NativeAdImpl: NSObject, IosNativeAd {
    private var ad: GADNativeAd?   // nil'd in destroy() so the ad + media are released promptly

    let responseId: String
    let filledBy: String
    let latencyMs: Int64
    let rawDump: String
    let waterfall: [IosAdapterAttempt]

    init(ad: GADNativeAd) {
        self.ad = ad
        let ri = ad.responseInfo
        self.responseId = ri?.responseIdentifier ?? ""
        let loaded = ri?.loadedAdNetworkResponseInfo
        self.filledBy = loaded?.adSourceName ?? loaded?.adNetworkClassName ?? "Google AdMob Network"
        self.latencyMs = latencyMs(loaded)
        self.rawDump = ri?.description ?? ""
        self.waterfall = attempts(from: ri)
    }

    var advertiser: String? { ad?.advertiser }
    var headline: String? { ad?.headline }
    var body: String? { ad?.body }
    var callToAction: String? { ad?.callToAction }
    var store: String? { ad?.store }
    var price: String? { ad?.price }
    var starRating: Double { ad?.starRating?.doubleValue ?? Double.nan }
    var adChoicesUrl: String? { nil } // AdChoices rendered as overlay by GADNativeAdView

    func makeView() -> UIView {
        guard let ad = ad else { return UIView() }
        let adView = GADNativeAdView()
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 6
        stack.translatesAutoresizingMaskIntoConstraints = false

        let media = GADMediaView()
        media.mediaContent = ad.mediaContent
        media.heightAnchor.constraint(equalToConstant: 200).isActive = true

        let headline = UILabel()
        headline.text = ad.headline
        headline.font = .boldSystemFont(ofSize: 16)

        stack.addArrangedSubview(media)
        stack.addArrangedSubview(headline)
        if let body = ad.body { let l = UILabel(); l.text = body; l.numberOfLines = 0; stack.addArrangedSubview(l) }

        adView.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: adView.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: adView.trailingAnchor),
            stack.topAnchor.constraint(equalTo: adView.topAnchor),
            stack.bottomAnchor.constraint(equalTo: adView.bottomAnchor),
        ])

        adView.headlineView = headline
        adView.mediaView = media
        adView.nativeAd = ad
        return adView
    }

    func destroy() { ad = nil }
}
