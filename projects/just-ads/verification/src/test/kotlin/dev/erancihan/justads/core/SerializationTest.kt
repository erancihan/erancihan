package dev.erancihan.justads.core

import dev.erancihan.justads.core.model.AdFormat
import dev.erancihan.justads.core.model.AdRecord
import dev.erancihan.justads.core.model.AdapterAttempt
import dev.erancihan.justads.core.model.NativeCreative
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class SerializationTest {
    private val json = Json { prettyPrint = false }

    @Test
    fun adRecord_round_trips_through_json() {
        val original = AdRecord(
            id = "resp-123",
            format = AdFormat.NATIVE,
            filledBy = "Google AdMob Network",
            personalized = true,
            loadedAtEpochMs = 1_700_000_000_000L,
            latencyMs = 187L,
            waterfall = listOf(
                AdapterAttempt("AppLovin", "id-applovin", 90L, error = "no fill"),
                AdapterAttempt("Google AdMob Network", "id-admob", 97L, error = null),
            ),
            creative = NativeCreative(
                advertiser = "Acme",
                headline = "Buy stuff",
                callToAction = "Install",
                starRating = 4.5,
                adChoicesUrl = "https://adssettings.google.com",
            ),
            rawResponseDump = "ResponseInfo{...}",
        )

        val decoded = json.decodeFromString<AdRecord>(json.encodeToString(original))
        assertEquals(original, decoded)
    }

    @Test
    fun waterfall_filled_flag_reflects_error() {
        assertTrue(AdapterAttempt("net", error = null).filled)
        assertTrue(!AdapterAttempt("net", error = "x").filled)
    }

    @Test
    fun advertiserLabel_falls_back_to_network() {
        val withAdv = adRecord(advertiser = "Acme", filledBy = "AdMob")
        val without = adRecord(advertiser = null, filledBy = "AdMob")
        assertEquals("Acme", withAdv.advertiserLabel)
        assertEquals("AdMob", without.advertiserLabel)
    }
}
