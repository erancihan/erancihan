package dev.erancihan.justads.data

import android.content.Context
import app.cash.sqldelight.driver.android.AndroidSqliteDriver
import dev.erancihan.justads.db.JustAdsDb

fun createJustAdsDb(context: Context): JustAdsDb =
    JustAdsDb(AndroidSqliteDriver(JustAdsDb.Schema, context, "justads.db"))
