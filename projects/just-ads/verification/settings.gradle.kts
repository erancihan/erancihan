// Dev-only harness (NOT part of the KMP app build). It compiles the pure-Kotlin
// `core` package from composeApp/commonMain on the JVM and unit-tests it, so the
// business logic can be verified on a machine without the Android SDK / Xcode.
// See PLAN.md and README.md. The KMP build never includes this project.
rootProject.name = "just-ads-core-verify"
