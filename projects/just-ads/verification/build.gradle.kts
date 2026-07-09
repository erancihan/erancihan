plugins {
    kotlin("jvm") version "2.1.0"
    kotlin("plugin.serialization") version "2.1.0"
}

repositories {
    mavenCentral()
}

kotlin {
    // Compile the SAME source files the KMP commonMain uses — no copy, no drift.
    // The `core` package is deliberately free of Compose / Android / expect-actual,
    // so it compiles as plain Kotlin/JVM here.
    sourceSets["main"].kotlin.srcDir("../composeApp/src/commonMain/kotlin/dev/erancihan/justads/core")
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.9.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
    testImplementation(kotlin("test"))
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.9.0")
}

tasks.test {
    testLogging {
        events("passed", "failed", "skipped")
        showStandardStreams = false
    }
}
