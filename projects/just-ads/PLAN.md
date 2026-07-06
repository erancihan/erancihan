# JustAds — Kotlin Multiplatform Ads App: Implementation Plan

> **Status:** Planning document. Implementation to be done by a follow-up agent.
> **Targets:** Android + iOS from a single Kotlin Multiplatform codebase.
> **Product in one sentence:** An app whose entire purpose is to show the user the ads
> that would be shown to them. No other features in v1 (features may come later).

---

## 1. Product definition (v1 scope)

- The user opens the app and sees ads. That is the product.
- v1 surface area:
  - A single main screen that displays ads (a scrollable feed of native ads + an
    anchored adaptive banner).
  - A "show me a full-screen ad" action (interstitial on demand).
  - A "watch a rewarded ad" action (rewarded video on demand) — no actual reward
    economy in v1; the "reward" is a counter ("ads watched").
  - First-run consent flow (GDPR/UMP + iOS App Tracking Transparency).
  - A minimal settings/about screen (privacy policy link, consent re-prompt,
    SDK version info).
- Explicit non-goals for v1: accounts, backend, push, analytics beyond the ad SDK's
  own, offline behavior beyond a graceful "no ads available" state.

### Working identity (confirm before implementation)

| Item | Proposed value |
|---|---|
| Working name | JustAds |
| Android applicationId / iOS bundle id | `dev.erancihan.justads` |
| Min Android | API 24 (Google Mobile Ads SDK minimum is 23; 24 keeps things simple) |
| Min iOS | iOS 15.0 (Compose Multiplatform + Google Mobile Ads SDK 12.x both comfortable here) |

---

## 2. ⚠️ Policy reality check (read this first)

This is the load-bearing section. "An app that only shows ads" runs into three
separate policy walls, and the design below is shaped by them:

1. **AdMob ad-placement policy** prohibits ads on screens with *no content or
   low-value content*, and apps whose primary purpose is ad consumption can get
   the AdMob account limited or suspended.
2. **Apple App Review Guideline 4.2 (Minimum Functionality)** rejects apps that are
   "primarily marketing materials or advertisements."
3. **Google Play policy** similarly rejects apps with no user value and disallows
   incentivizing users to view ads as the core mechanic.

### Mitigation: ads presented *as* content ("Ad Gallery" framing)

The app keeps the spirit of "you just see ads," but is framed and built as an
**ad transparency / discovery gallery**:

- The main feed uses **native ads** rendered as cards in a real, designed feed UI —
  each card clearly labeled "Ad", with the app chrome around it (pull-to-refresh,
  a card counter, a "why am I seeing this?" info affordance pointing at the
  consent/settings screen).
- The app's store-listing story is: *"See the ads targeted at you, in one place,
  with your consent choices in your control."* Consent management, transparency
  info, and an "ads watched" stat give it a thin-but-genuine utility layer.
- Interstitial and rewarded ads are **user-initiated** (button press), never
  auto-fired in a loop — this avoids the "app built to farm impressions" pattern
  that gets AdMob accounts banned.

**Residual risk to accept:** even with this framing, Apple review outcome is not
guaranteed; be prepared to add one small genuine feature (e.g., a daily
wallpaper/quote alongside the feed) if the first submission is rejected under 4.2.
The architecture below keeps that cheap to add. Do **not** run high volumes of real
ads on a personal AdMob account during development — use test ad units everywhere
until release (real ad units clicked/viewed by the developer = invalid traffic =
account suspension).

---

## 3. Tech stack decisions

| Concern | Decision | Rationale |
|---|---|---|
| Language/platform | Kotlin Multiplatform | As requested |
| UI | **Compose Multiplatform** (single shared UI, stable on iOS since 1.8) | One UI codebase; ad views embedded via `AndroidView` / `UIKitView` interop |
| Ads network | **Google AdMob** (Google Mobile Ads SDK) only in v1 | Largest fill, one integration to maintain; mediation (AppLovin MAX, etc.) is a later optimization |
| Consent | Google **UMP SDK** (User Messaging Platform) both platforms + **ATT** prompt on iOS | Required for EEA/UK GDPR and Apple tracking rules; UMP is AdMob's canonical path |
| DI | **Koin** (KMP-friendly) — or manual wiring, the app is tiny | Keep it light; manual constructor injection is acceptable for v1 |
| Async/state | Coroutines + `StateFlow`, shared `ViewModel` in `commonMain` (androidx lifecycle-viewmodel KMP artifact) | Standard KMP practice |
| Build | Gradle (Kotlin DSL) + version catalog; Xcode project for the iOS shell | Standard KMP template layout |
| iOS ads interop | **Swift-side implementation injected into shared code** (see §5.3), Google Mobile Ads via **Swift Package Manager** | Avoids the CocoaPods–cinterop maintenance tax; SPM is the SDK's modern path |

**Versions:** pin to latest stable at implementation time and record them in
`gradle/libs.versions.toml`. Approximate expectations (verify, don't trust blindly):
Kotlin 2.2.x, Compose Multiplatform 1.9.x, AGP 8.x, Google Mobile Ads Android SDK
24.x (`com.google.android.gms:play-services-ads`), Google Mobile Ads iOS SDK 12.x
(SPM: `swift-package-manager-google-mobile-ads`), UMP Android
(`com.google.android.ump:user-messaging-platform`) 3.x, iOS
`GoogleUserMessagingPlatform` bundled/companion package.

---

## 4. Repository / module layout

Implement in a **new dedicated repository** (`erancihan/just-ads`), then add it under
`projects/just-ads` as a submodule — matching how `projects/tradebot` etc. are wired
into this monorepo. (This PLAN.md lives in the monorepo; move/copy it into the new
repo's root when scaffolding.)

Scaffold from the official JetBrains KMP template (`kmp.jetbrains.com` generator or
`compose-multiplatform-template`):

```
just-ads/
├── gradle/libs.versions.toml
├── settings.gradle.kts
├── build.gradle.kts
├── composeApp/
│   ├── build.gradle.kts
│   └── src/
│       ├── commonMain/kotlin/dev/erancihan/justads/
│       │   ├── App.kt                    # root composable, navigation
│       │   ├── ui/FeedScreen.kt          # native-ad feed + banner slot
│       │   ├── ui/SettingsScreen.kt
│       │   ├── ads/AdsController.kt      # platform-agnostic ads API (see §5.1)
│       │   ├── ads/AdsState.kt           # sealed load states, ad models
│       │   ├── ads/BannerAd.kt           # expect composable
│       │   └── consent/ConsentManager.kt # expect/actual or interface
│       ├── androidMain/kotlin/...        # actuals: AdMob Android impl
│       │   └── MainActivity.kt
│       └── iosMain/kotlin/...            # actuals: delegate to injected Swift impl
└── iosApp/
    ├── iosApp.xcodeproj                  # Google-Mobile-Ads-SDK via SPM
    └── iosApp/
        ├── iOSApp.swift
        ├── AdsControllerIos.swift        # implements shared Kotlin interface
        └── Info.plist                    # GADApplicationIdentifier, ATT string, SKAdNetwork ids
```

---

## 5. Ads architecture

There is no cross-platform AdMob SDK: the Android SDK is Java/Kotlin, the iOS SDK is
Obj-C/Swift. The shared code therefore defines the contract; each platform fulfills it.

### 5.1 Shared contract (`commonMain`)

```kotlin
interface AdsController {
    val initState: StateFlow<AdsInitState>            // Idle / Initializing / Ready / Failed

    suspend fun initialize()                          // gate on consent (§6)

    // Full-screen formats — load-then-show, one in flight at a time
    suspend fun loadInterstitial(): AdLoadResult
    fun showInterstitial(onDismissed: () -> Unit)
    suspend fun loadRewarded(): AdLoadResult
    fun showRewarded(onReward: (amount: Int) -> Unit, onDismissed: () -> Unit)

    // Feed — native ads exposed as opaque platform handles rendered by expect UI
    suspend fun loadNativeAd(): NativeAdHandle?       // null on no-fill
}

sealed interface AdLoadResult { data object Loaded; data class Failed(val reason: String) }
```

- `NativeAdHandle` is an `expect class` wrapping `NativeAd` (Android) /
  `GADNativeAd` (iOS) with a common `destroy()`; feed items own their handle
  lifecycle (destroy on eviction).
- ViewModel in `commonMain` (`FeedViewModel`) owns: feed list of loaded native ads,
  load-more paging (load 1–2 ahead of scroll), retry/backoff on no-fill (exponential,
  cap ~5 min — **never** hot-loop ad requests; that's an invalid-traffic signal),
  interstitial/rewarded orchestration, "ads watched" counter (persist with
  `multiplatform-settings` or DataStore KMP).

### 5.2 Banner + native rendering (expect composables)

```kotlin
@Composable expect fun BannerAd(adUnitId: String, modifier: Modifier = Modifier)
@Composable expect fun NativeAdCard(handle: NativeAdHandle, modifier: Modifier = Modifier)
```

- **androidMain:** `AndroidView` hosting `AdView` (adaptive banner sized from
  container width) and a `NativeAdView` bound to the handle's assets.
- **iosMain:** `UIKitView` hosting the banner view / a native-ad `UIView` built by
  the Swift factory (§5.3). Respect intrinsic ad sizes; adaptive banner height comes
  from the SDK's `currentOrientationAnchoredAdaptiveBanner` API on both platforms.

### 5.3 iOS interop strategy (important — do it this way)

Do **not** cinterop the Google Mobile Ads SDK into Kotlin. Instead:

1. `commonMain` defines the `AdsController`, `ConsentManager`, and a
   `NativeAdViewFactory` interface (returns `UIView`-typed values only inside
   `iosMain` wrappers).
2. `iosApp` (Swift) implements them (`AdsControllerIos.swift`) against the real SDK —
   full-screen presentation uses the root `UIViewController`.
3. Swift passes the implementations into the shared entry point:
   `MainViewController(adsController: AdsControllerIos(), ...)`.

This keeps the Kotlin/Native ↔ ObjC boundary to interfaces you own, builds with SPM,
and survives SDK major-version renames (v12 dropped the `GAD` prefix in Swift).

### 5.4 Ad unit IDs & config

- All IDs live in one `AdsConfig` object in `commonMain`, with `debug` builds
  hard-wired to **Google's published test ad unit IDs** and test-device
  registration. Real IDs only in release config, sourced from AdMob console
  (one app per platform: Android app + iOS app under one AdMob account).
- Android manifest needs `com.google.android.gms.ads.APPLICATION_ID` meta-data;
  iOS `Info.plist` needs `GADApplicationIdentifier` — missing either crashes the
  SDK on init. Use the sample app IDs until the AdMob account exists.

---

## 6. Consent & privacy flow (blocking, in order)

On every cold start, **before any ad request**:

1. **UMP:** `requestConsentInfoUpdate` → `loadAndShowConsentFormIfRequired` (shows
   Google's consent form for EEA/UK users; no-op elsewhere). Configure the consent
   form + IDFA explanation message in the AdMob console (one-time setup task).
2. **ATT (iOS only):** after UMP (UMP's iOS flow can present the IDFA explainer
   first), request `ATTrackingManager.requestTrackingAuthorization`. Denial is fine —
   ads become non-personalized; the app must still work.
3. `canRequestAds == true` → `MobileAds.initialize` (Android) /
   `MobileAds.shared.start` (iOS) → unblock the feed.

Settings screen exposes "Manage consent" (UMP privacy-options re-entry point —
required by Google when applicable) and links to a privacy policy.

**Release-time paperwork checklist (needs a human):** AdMob account + 2 apps + ad
units; consent message configured in AdMob console; hosted privacy policy page;
`app-ads.txt` on the developer domain; Play Data Safety form; App Store Privacy
Nutrition labels; iOS privacy manifest reqs are satisfied by the SDK's bundled
`PrivacyInfo.xcprivacy` (verify at build); `SKAdNetworkItems` in Info.plist per
Google's current documented list; `NSUserTrackingUsageDescription` string.

---

## 7. Milestones (each independently verifiable)

**M1 — Scaffold.** KMP + Compose Multiplatform template builds and runs an empty
"JustAds" screen on an Android emulator and iOS simulator. Version catalog pinned.
CI (GitHub Actions): Android assemble + unit tests on `ubuntu-latest`; iOS
build on `macos-latest` (simulator, no signing).
*Done when: both apps launch showing shared UI; CI green.*

**M2 — Ads plumbing with test ads.** `AdsController` contract + Android actual +
Swift iOS impl; SDK init; anchored adaptive **banner** renders Google test ads on
both platforms.
*Done when: test banner visibly renders on device/simulator on both platforms.*

**M3 — Full-screen + native formats.** Interstitial and rewarded (buttons on feed
screen), native-ad feed with paging, handle lifecycle (destroy on eviction),
no-fill/backoff handling, "ads watched" counter persisted.
*Done when: all four formats show test ads; rotating & backgrounding don't leak or crash.*

**M4 — Consent.** UMP flow + ATT + privacy-options entry point in settings; ads
gated behind `canRequestAds`; verified with UMP debug geography (`EEA` test mode).
*Done when: forced-EEA run shows consent form before any ad request; decline path still yields (non-personalized) ads.*

**M5 — Release readiness.** Real ad units wired to release builds only; §6 paperwork
checklist executed; store listings drafted with the transparency/gallery framing
(§2); icons/splash; versioning + signed release pipelines.
*Done when: internal-track AAB on Play + TestFlight build submitted.*

Suggested effort split for the implementing agent: M1–M3 are pure code and fully
automatable with test IDs; M4 needs an AdMob console consent message (human);
M5 is mostly human/account work.

---

## 8. Risks & open decisions

| # | Item | Default if not overridden |
|---|---|---|
| 1 | Store rejection under "minimum functionality" (§2) | Ship the gallery framing; if rejected, add one micro-feature (daily wallpaper/quote) — architecture already isolates the feed so this is additive |
| 2 | AdMob account risk from self-testing | Test ad units everywhere until release; register test devices; never click real ads |
| 3 | Network choice | AdMob solo in v1; revisit mediation only if fill/eCPM disappoints |
| 4 | New repo vs. building inside the monorepo | New repo `erancihan/just-ads` + submodule here (matches existing convention) |
| 5 | App/bundle identity (§1 table) | `dev.erancihan.justads`, name "JustAds" |
| 6 | Compose Multiplatform on iOS vs. SwiftUI shell | Shared Compose UI everywhere; ad views bridged natively (§5) |

## 9. Future-feature hooks (why the architecture looks like this)

- `AdsController` is an interface → mediation or a second network is a new impl,
  not a rewrite.
- Feed is a list of sealed `FeedItem`s (currently only `FeedItem.Ad`) → interleaving
  real content later is additive.
- Consent, ads, and UI are separate packages → a future backend/analytics layer
  doesn't touch ad code.

## 10. Primary references for the implementing agent

- KMP/Compose template: `kmp.jetbrains.com` (JetBrains wizard) or
  `JetBrains/compose-multiplatform-template`
- AdMob Android: `developers.google.com/admob/android` (get-started, banner,
  interstitial, rewarded, native, test-ads pages)
- AdMob iOS: `developers.google.com/admob/ios` (same set; SPM install path)
- UMP/consent: `developers.google.com/admob/android/privacy` and `/admob/ios/privacy`
- Compose ↔ UIKit interop: `UIKitView` docs in Compose Multiplatform
- Policy pages to re-read before store submission: AdMob ad-placement policies;
  Apple guideline 4.2; Play "Ads" + "Minimum functionality" policies
