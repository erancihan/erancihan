package dev.erancihan.justads.data

import app.cash.sqldelight.driver.native.NativeSqliteDriver
import dev.erancihan.justads.db.JustAdsDb

fun createJustAdsDb(): JustAdsDb =
    JustAdsDb(NativeSqliteDriver(JustAdsDb.Schema, "justads.db"))
