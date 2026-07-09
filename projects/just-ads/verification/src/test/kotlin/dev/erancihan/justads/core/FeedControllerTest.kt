package dev.erancihan.justads.core

import dev.erancihan.justads.core.ads.AdOutcome
import dev.erancihan.justads.core.ads.BackoffPolicy
import dev.erancihan.justads.core.data.InMemoryAdHistoryDao
import dev.erancihan.justads.core.feed.FeedController
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class FeedControllerTest {
    private fun controller(
        ads: FakeAdsController,
        history: InMemoryAdHistoryDao = InMemoryAdHistoryDao(),
        backoff: BackoffPolicy = BackoffPolicy(baseMs = 2_000, maxMs = 300_000),
    ) = FeedController(ads, history, backoff)

    @Test
    fun loadMore_appends_card_and_logs_to_history() = runTest {
        val ads = FakeAdsController()
        val history = InMemoryAdHistoryDao()
        val handle = FakeNativeAdHandle(adRecord(id = "n1", advertiser = "Acme"))
        ads.queueNative(handle)
        val c = controller(ads, history)

        c.loadMore()

        val state = c.state.value
        assertEquals(listOf("n1"), state.items.map { it.record.id })
        assertEquals(false, state.loading)
        assertNull(state.error)
        assertEquals(1, state.session.adsSeen)
        assertEquals(1, state.session.advertisers)
        assertEquals(1, state.session.networks)
        assertEquals(listOf("n1"), history.all().map { it.id })
    }

    @Test
    fun failure_sets_error_and_backoff_then_recovers() = runTest {
        val ads = FakeAdsController()
        ads.queueNativeFailure("no-fill")
        ads.queueNativeFailure("no-fill")
        ads.queueNative(FakeNativeAdHandle(adRecord(id = "ok")))
        val c = controller(ads)

        c.loadMore()
        assertEquals("no-fill", c.state.value.error)
        assertEquals(2_000, c.state.value.nextRetryDelayMs) // 1st consecutive failure

        c.loadMore()
        assertEquals(4_000, c.state.value.nextRetryDelayMs) // 2nd consecutive failure

        c.loadMore() // success resets the failure streak
        assertNull(c.state.value.error)
        assertNull(c.state.value.nextRetryDelayMs)
        assertEquals(listOf("ok"), c.state.value.items.map { it.record.id })

        // A subsequent failure starts the backoff over at base, proving the reset.
        ads.queueNativeFailure("no-fill")
        c.loadMore()
        assertEquals(2_000, c.state.value.nextRetryDelayMs)
    }

    @Test
    fun refresh_destroys_handles_clears_items_keeps_adsWatched() = runTest {
        val ads = FakeAdsController()
        val h1 = FakeNativeAdHandle(adRecord(id = "a"))
        ads.queueNative(h1)
        ads.rewardedOutcomes.addLast(AdOutcome.Loaded(adRecord(id = "r", format = dev.erancihan.justads.core.model.AdFormat.REWARDED)))
        ads.queueNative(FakeNativeAdHandle(adRecord(id = "b")))
        val c = controller(ads)

        c.loadMore()                       // card a
        c.loadRewarded()                   // capture reward ad
        c.presentRewarded(onDismissed = {}) // increments adsWatched
        assertEquals(1, c.state.value.adsWatched)

        c.refresh()                        // destroys a, loads b, keeps adsWatched

        assertTrue(h1.destroyed)
        assertEquals(listOf("b"), c.state.value.items.map { it.record.id })
        assertEquals(1, c.state.value.adsWatched)
    }

    @Test
    fun refresh_discards_in_flight_load_and_releases_it() = runTest {
        val ads = FakeAdsController()
        val g1 = CompletableDeferred<Unit>()
        val g2 = CompletableDeferred<Unit>()
        ads.nativeGates.addLast(g1)
        ads.nativeGates.addLast(g2)
        // The fake pops an outcome only AFTER its gate resolves, so the load whose gate
        // completes first claims the first-queued outcome. We complete g2 (refresh's
        // current-generation load) first, so queue "fresh" first and "stale" second.
        val staleHandle = FakeNativeAdHandle(adRecord(id = "stale"))
        ads.queueNative(FakeNativeAdHandle(adRecord(id = "fresh"))) // claimed by refresh's load (g2)
        ads.queueNative(staleHandle)                               // claimed by the stale load (g1)
        val c = controller(ads)

        val a = launch { c.loadMore() } // takes g1, suspends in flight
        runCurrent()
        val r = launch { c.refresh() }  // bumps generation; its loadMore takes g2, suspends
        runCurrent()

        g2.complete(Unit); runCurrent() // fresh load (current generation) is applied
        g1.complete(Unit); runCurrent() // stale load (old generation) is discarded

        a.join(); r.join()
        assertEquals(listOf("fresh"), c.state.value.items.map { it.record.id })
        assertTrue(staleHandle.destroyed, "superseded ad must be released")
    }

    @Test
    fun feed_cards_have_unique_keys_even_with_blank_ids() = runTest {
        val ads = FakeAdsController()
        ads.queueNative(FakeNativeAdHandle(adRecord(id = "")))
        ads.queueNative(FakeNativeAdHandle(adRecord(id = "")))
        val c = controller(ads)
        c.loadMore(); c.loadMore()
        val keys = c.state.value.items.map { it.key }
        assertEquals(keys.size, keys.toSet().size)
    }

    @Test
    fun evict_destroys_and_removes_card() = runTest {
        val ads = FakeAdsController()
        val handle = FakeNativeAdHandle(adRecord(id = "z"))
        ads.queueNative(handle)
        val c = controller(ads)
        c.loadMore()

        val card = c.state.value.items.single()
        c.evict(card)

        assertTrue(handle.destroyed)
        assertTrue(c.state.value.items.isEmpty())
    }

    @Test
    fun interstitial_load_captures_and_present_invokes_sdk() = runTest {
        val ads = FakeAdsController()
        val history = InMemoryAdHistoryDao()
        ads.interstitialOutcomes.addLast(
            AdOutcome.Loaded(adRecord(id = "i1", format = dev.erancihan.justads.core.model.AdFormat.INTERSTITIAL))
        )
        val c = controller(ads, history)

        val outcome = c.loadInterstitial()
        assertTrue(outcome is AdOutcome.Loaded)
        assertEquals(listOf("i1"), history.all().map { it.id })
        assertEquals(1, c.state.value.session.adsSeen)

        var dismissed = false
        c.presentInterstitial { dismissed = true }
        assertEquals(1, ads.interstitialShown)
        assertTrue(dismissed)
    }
}
