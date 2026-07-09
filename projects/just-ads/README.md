# JustAds

A personal Kotlin Multiplatform (Android + iOS) app whose purpose is to **show you the
ads that ad networks serve to you** — each ad rendered as an inspectable specimen, with a
persistent log and stats over time. Not a store app; built to sideload onto your own
devices. See [`PLAN.md`](PLAN.md) for the full design and rationale.

> **Why "gallery / transparency" and not a blank ad shell:** an app that only shows ads
> violates AdMob's placement policy and store minimum-functionality rules. Presenting ads
> *as content you inspect* (who filled it, personalized or not, latency, mediation
> waterfall, raw response) is both policy-sane and the actual point — "what do advertisers
> deem fit to show me?" See PLAN.md §2.

## What it does

- **Gallery** — a feed of native ads, each labelled and inspectable, with a pinned banner
  and on-demand interstitial/rewarded buttons.
- **Ad detail** — full metadata, mediation waterfall, AdChoices link, raw `ResponseInfo`
  with copy-to-clipboard.
- **History** — every ad served to this device, persisted (SQLDelight), newest-first, filterable.
- **Stats** — totals, personalized ratio, top advertisers/networks, by-format, per-day.
- **Settings** — guarded test↔real ad-source toggle, consent entry point (real path),
  a link to Google My Ad Center.

## Architecture (PLAN.md §5)

```
composeApp/
  commonMain/  core/            ← pure Kotlin: models, AdStats, BackoffPolicy, FeedController,
                                  AdsController/ConsentManager/AdHistoryDao interfaces  (UNIT-TESTED)
               ui/ + data/ + di/ ← Compose Multiplatform screens, SQLDelight DAO, DI seam
               sqldelight/       ← StoredAd schema
  androidMain/                  ← AdMob impl (Google Mobile Ads SDK), UMP consent, Android driver
  iosMain/                      ← bridge to a Swift ad loader, native driver, MainViewController
iosApp/                         ← SwiftUI shell + AdsBridgeIos.swift (Google Mobile Ads)
verification/                   ← dev-only JVM harness (see below)
```

There is no cross-platform AdMob SDK, so `commonMain` defines the `AdsController` contract
and each platform fulfills it: Android directly, iOS via a Swift implementation injected at
startup (PLAN.md §5.3). The whole UI depends only on the platform-agnostic `AppDependencies`.

## Build & run

Requires the Android SDK and (for iOS) a Mac with Xcode — **neither is available in the
environment this was scaffolded in**, so the app modules were written but not compiled here.
See "Verification" for what *was* checked.

### Android
```bash
./gradlew :composeApp:assembleDebug          # build
./gradlew :composeApp:installDebug           # install on a connected device/emulator
```
Ships wired to Google's **test** ad units — safe to run immediately, no AdMob account needed.

### iOS
See [`iosApp/README.md`](iosApp/README.md): `xcodegen generate`, open in Xcode, let SPM
resolve GoogleMobileAds, Run. Personal deploy needs only your Apple ID (free = weekly
re-sign; paid = yearly). No App Store / TestFlight required.

## Verification

The environment can't compile the mobile targets (Google Maven blocked, no Android SDK, no
macOS). To verify the logic that actually matters, the **pure-Kotlin `core` package** (and
the `ui/format` date math) is compiled and unit-tested on the JVM against Maven Central:

```bash
cd verification && gradle test        # 26 tests: AdStats, BackoffPolicy, FeedController,
                                      # history DAO, serialization, UTC date formatting
```

The harness compiles the **same** source files as the KMP build via `srcDir` (no copy, no
drift). It is standalone and never part of the app build. Everything outside `core`/`format`
(Compose UI, SQLDelight DAO, Android/iOS platform code, Swift) is written to be correct but
must be compiled on a real toolchain.

## Test ads vs. real ads

- **Test ads (default):** Google's sample units. Always fill, zero account risk, but
  **generic placeholders** — not ads targeted at you.
- **Real ads path:** shows the ads AdMob fills for your profile. Requires real ad unit IDs
  (`config/AdsConfig.kt`, Android manifest `APPLICATION_ID`, iOS `GADApplicationIdentifier`)
  and a consent manager (UMP + iOS ATT). **Viewing your own real ads is invalid traffic;
  clicking them can get the AdMob account suspended** — use a dedicated/throwaway account
  and never click (PLAN.md §2, §6). This is why the Settings toggle is guarded.

Honest limit: this only ever shows what *Google's* network fills for *this app*, given your
ad profile + consent. It's a real slice of your Google ad profile — not every ad you see
elsewhere. Google **My Ad Center** is the authoritative view of that profile.

## Status vs. plan

Milestones M1–M4 (scaffold, banner, all formats + capture + inspect UI, history + stats)
are implemented as source. M5 (consent) exists for the real-ads path. M6 is packaging onto
your devices. The core logic is unit-tested; the rest awaits a real build.
