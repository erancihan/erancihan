# JustAds — Kotlin Multiplatform Ads App: Implementation Plan

> **Status:** Planning document. Implementation to be done by a follow-up agent.
> **Targets:** Android + iOS from a single Kotlin Multiplatform codebase.
> **Distribution:** Personal / sideload. **Not** going to the App Store or Play Store.
> **Product in one sentence:** A personal instrument for seeing the ads that ad networks
> serve to *you* — each ad shown as an inspectable specimen, not as monetization.

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

## 2. Distribution & policy reality (personal app, no store)

Because this app is **not** being submitted to any store, two of the three policy
walls simply don't apply:

- **Apple Guideline 4.2 (Minimum Functionality)** — a *review-time* gate. No store
  submission → no review → not a factor. (Distribution on iOS instead: run from Xcode
  onto your own device. Free Apple ID = 7-day provisioning; paid dev account
  ($99/yr) = 1-year. See §7 deployment.)
- **Google Play minimum-functionality / spam policy** — also review-time. Not a
  factor for a sideloaded APK.

The one wall that remains is **AdMob's ad-serving policy, which is account-level, not
store-level** — and it only bites *if you request real ads from a real ad unit*:

- AdMob is built for publishers monetizing content. An app that only shows ads, where
  the account owner is the one viewing them, is **invalid traffic** by definition.
  Rendering your own real ads is a soft violation; **clicking them is the fast path to
  suspension.** A suspension can taint the whole Google account.
- Therefore the ad-source strategy is a deliberate toggle (already modeled in §5.4):
  - **Test ad units (default, safe):** always fill, zero account risk. But they render
    **generic placeholders** ("Test Ad — Sample…"), *not* ads targeted at you.
  - **Real ad units (fulfills the actual goal):** shows the ads AdMob's network fills
    for your ad profile. Do this only on a **dedicated/throwaway AdMob account**, keep
    volume low, and **never click**. Treat any suspension as expected cost.

### The "gallery / transparency" framing is now a *product* choice, not a compliance one

We keep it because it's literally the goal ("what do advertisers deem fit to show
me"), not to pass review:

- The feed uses **native ads** rendered as inspectable cards — each labeled "Ad", each
  showing the transparency metadata the SDK exposes (§5.5): which ad source/network
  filled it, personalized vs. non-personalized, load timestamp, the native asset
  fields (advertiser, headline, store, price).
- Interstitial/rewarded stay **user-initiated** (never auto-looped) — partly good
  manners toward the ad network, mostly because auto-spamming impressions isn't the
  point; you want to *look at* each ad.

**Honest scope limit (unchanged from prior discussion):** this only ever shows what
*Google's network* fills for *this app* given your device ad ID / IDFA + consent. It
is a real slice of your Google ad profile, not your whole ad shadow (Instagram,
YouTube, etc. serve from closed networks). Google's **My Ad Center** is the
authoritative view of the profile behind these ads — complementary, not replaced.

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
| Persistence | **SQLDelight** (KMP SQLite) for the ad-history log + aggregate queries; `multiplatform-settings` for small prefs (source toggle, counters) | A longitudinal log needs real queries/aggregation; a key-value store is too weak for "top advertisers over time" |
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
│       │   ├── ui/GalleryScreen.kt       # native-ad feed + banner + inspect drawer
│       │   ├── ui/AdDetailScreen.kt       # full metadata, waterfall, raw dump
│       │   ├── ui/HistoryScreen.kt        # persisted log of every AdRecord
│       │   ├── ui/StatsScreen.kt          # aggregates: top advertisers/networks, %
│       │   ├── ui/SettingsScreen.kt
│       │   ├── data/AdFeedRepository.kt   # capture → AdRecord → session list + DB
│       │   ├── data/AdHistoryDao.kt       # SQLDelight-backed queries/aggregates
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

### 5.5 Transparency data model (this IS the product)

Every loaded ad — banner, native, interstitial, rewarded — is captured into a
platform-agnostic `AdRecord` built from what the SDK already exposes. This is the
data the UI inspects.

```kotlin
data class AdRecord(
    val id: String,                 // ResponseInfo.responseId
    val format: AdFormat,           // Banner / Native / Interstitial / Rewarded
    val filledBy: String,           // loaded adapter's adSourceName ("Google AdMob Network", or a mediated net)
    val personalized: Boolean,      // derived from consent/ATT state at request time
    val loadedAtEpochMs: Long,      // app-stamped (SDK gives no timestamp)
    val latencyMs: Long?,           // loaded adapter latency
    val waterfall: List<AdapterAttempt>,   // every adapter tried: name, latency, error — the mediation story
    val creative: NativeCreative?,  // present for native ads
    val rawResponseDump: String,    // ResponseInfo.toString() — the nerd view
)

data class NativeCreative(         // from NativeAd / GADNativeAd assets
    val advertiser: String?, val headline: String?, val body: String?,
    val callToAction: String?, val store: String?, val price: String?,
    val starRating: Double?, val adChoicesUrl: String?,   // AdChoices "i" → advertiser info
    // icon/images/mediaContent stay as platform handles for rendering, not in the record
)
```

Source APIs (verify names against the SDK version at build):
- **`ResponseInfo`** (on every loaded ad, both platforms): `responseId`,
  `loadedAdapterResponseInfo`, `adapterResponses` (the waterfall),
  `mediationAdapterClassName`.
- **`AdapterResponseInfo`**: `adSourceName`, `adSourceId`, `latencyMillis`, `adError`.
- **Native assets**: headline/body/advertiser/price/store/starRating/`adChoicesInfo`.
- **Personalization** is not a per-ad field — derive it from UMP `canRequestAds` + the
  NPA flag you set + iOS ATT status, captured at request time.

`AdFeedRepository` (commonMain) owns capture: on every successful load it builds an
`AdRecord`, appends it to the in-memory session list, and persists it via
`AdHistoryDao` (SQLDelight). This decouples "render the ad" (platform UI) from
"inspect the ad" (shared data), which is the whole architectural point — and means
the live viewer and the persistent history read from the same capture path.

---

### 5.6 UI screens & navigation (the design)

Four top-level destinations (bottom nav bar) + one pushed detail screen. Compose
Multiplatform Navigation, or a small sealed `Screen` route state (the app is tiny).

1. **Gallery** (home) — vertical scroll of native-ad cards. Each card renders the
   creative *as the advertiser built it*, tagged with a small "Ad" label, and carries
   a collapsible **inspect drawer** (filled-by, personalized y/n, latency, load time).
   Pull-to-refresh loads a fresh batch; anchored adaptive **banner** pinned at the
   bottom. A slim header shows this session's stats (ads seen · advertisers · networks).
   A FAB or header actions trigger the two full-screen formats.
2. **Ad detail** (pushed from a card) — the full `AdRecord`: every native asset,
   the complete **mediation waterfall** (each adapter tried, latency, error),
   AdChoices/advertiser link, and the raw `ResponseInfo` dump with copy-to-clipboard.
3. **History** — the persisted log of every `AdRecord`, newest first, with filters
   (format · network · personalized). Tapping a row opens Ad detail. Swipe/delete +
   "wipe all" (also in Settings).
4. **Stats** — aggregates over the whole history: totals, distinct advertisers &
   networks, personalized-vs-not ratio, top advertisers and top ad sources (simple
   bar list), and ads-per-day. This is the "what's the *pattern* of what I'm served"
   view — the real payoff of persisting.
5. **Settings / About** — the **test↔real ad-source toggle** (guarded with a
   confirmation explaining the AdMob account risk, §2), consent re-prompt (real path,
   §6), SDK versions, a link out to Google **My Ad Center**, and wipe-history.

Full-screen interstitial/rewarded are **actions, not destinations**: user taps →
format presents → on dismissal an `AdRecord` is captured and its Ad-detail card is
offered. Never auto-looped.

## 6. Consent & privacy flow (real-ads path only)

> Skip this entire section for a test-ads-only build — test ads don't need consent.
> It's required only when you flip to **real** ad units and want **personalized** ads
> (which is the whole point of the real path: personalization is what makes them
> "targeted at you"). Denying consent just yields non-personalized ads.

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

**M3 — Formats + capture + inspect UI.** Interstitial and rewarded (user-initiated),
native-ad Gallery with paging, handle lifecycle (destroy on eviction),
no-fill/backoff handling. Build the `AdRecord` on every load (§5.5), render the
per-card inspect drawer and the Ad-detail screen (waterfall + raw dump). Session
stats in-memory.
*Done when: all four formats show test ads and each produces an inspectable `AdRecord` with correct filled-by/latency/waterfall; rotate & background don't leak or crash.*

**M4 — History & stats (SQLDelight).** Persist every `AdRecord` via `AdHistoryDao`;
History screen (list + filters + delete/wipe); Stats screen (totals, distinct
advertisers/networks, personalized ratio, top-N, ads-per-day). Migrations set up.
*Done when: ads survive restart; History and Stats reflect them; wipe clears both.*

**M5 — Consent (real-ads path only, optional).** UMP flow + ATT + privacy-options
entry point in Settings; ads gated behind `canRequestAds`; verified with UMP debug
geography (`EEA` test mode). **Skip entirely for a test-ads-only build.**
*Done when: forced-EEA run shows consent form before any ad request; decline path still yields (non-personalized) ads.*

**M6 — Personal deployment (no store).** Package for your own devices:
- **Android:** `assembleRelease` → signed APK; `adb install` or copy to device. Done.
- **iOS:** run from Xcode onto your device with your Apple ID (free = re-sign weekly;
  paid = yearly). No TestFlight/App Review needed for personal use.
- Optional: flip to real ad units here (dedicated AdMob account, §2 caveats) if you
  want real targeted ads rather than test placeholders.
*Done when: the app runs from your home screen on your own Android phone and iPhone.*

Suggested effort split for the implementing agent: **M1–M4 are pure code**, fully
automatable with test IDs and independently verifiable (this is the whole app for a
test-ads build). **M5 (consent) is optional** — only for the real-ads path. **M6** is
just packaging + your signing identity.

---

## 8. Risks & open decisions

| # | Item | Default if not overridden |
|---|---|---|
| 1 | ~~Store rejection~~ | N/A — not shipping to a store (§2) |
| 2 | AdMob account suspension (real-ads path only) | Dedicated/throwaway AdMob account; low volume; **never click** your own ads; accept suspension as expected cost. Test-ads build carries zero risk |
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
