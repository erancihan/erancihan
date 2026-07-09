# iosApp — iOS shell

The iOS app is a thin SwiftUI shell that hosts the shared Compose UI and provides the
AdMob implementation in Swift (`AdsBridgeIos.swift`), which the Kotlin side consumes
through the `IosAdLoader` bridge (see `../PLAN.md` §5.3).

> **None of this was compiled in the planning environment** (no macOS/Xcode there).
> Treat it as a correct-by-construction starting point to finish and verify on a Mac.

## Files

| File | Purpose |
|---|---|
| `iosApp/iOSApp.swift` | `@main` app; hosts `MainViewController(loader:)` via `UIViewControllerRepresentable`. |
| `iosApp/AdsBridgeIos.swift` | Implements the Kotlin `IosAdLoader` against Google Mobile Ads (native / interstitial / rewarded / banner + `GADResponseInfo` metadata). |
| `iosApp/Info.plist` | `GADApplicationIdentifier` (test), ATT string, SKAdNetwork items. |
| `project.yml` | XcodeGen spec — generates `iosApp.xcodeproj`. |

## First-time setup (on a Mac)

1. Install tools: Xcode 15+, and `brew install xcodegen`.
2. Generate the project: from `iosApp/`, run `xcodegen generate`.
3. Open `iosApp.xcodeproj`; let Swift Package Manager resolve **GoogleMobileAds**.
4. Confirm the "Build & embed Compose (KMP) framework" pre-build script runs
   `./gradlew :composeApp:embedAndSignAppleFrameworkForXcode` and that
   `FRAMEWORK_SEARCH_PATHS` points at the generated framework (adjust per your
   Kotlin/Compose versions if the path differs).
5. Select your device/simulator and Run.

## Version note

`AdsBridgeIos.swift` is written against the **GAD-prefixed** API (SDK 11.x). If you pin
SDK **12.x** via SPM, rename the types (`GADBannerView` → `BannerView`,
`GADInterstitialAd` → `InterstitialAd`, `GADRequest` → `Request`, etc.).

## Deploying to your own device (no App Store)

Free Apple ID: signing profile lasts 7 days (re-run from Xcode weekly). Paid Apple
Developer account ($99/yr): 1 year. No TestFlight / App Review needed for personal use
(PLAN.md §7, M6).

## Real ads

Switch the unit IDs in `AdsBridgeIos.swift` + `GADApplicationIdentifier` in `Info.plist`
to your real AdMob IDs, and implement a UMP + ATT consent manager. See PLAN.md §2/§6 for
the account-risk caveats (dedicated account, never click your own ads).
