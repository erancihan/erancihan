package dev.erancihan.justads.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dev.erancihan.justads.core.feed.FeedCard
import dev.erancihan.justads.core.feed.FeedUiState
import dev.erancihan.justads.core.model.AdRecord
import dev.erancihan.justads.ui.ads.BannerAd
import dev.erancihan.justads.ui.ads.NativeAdMediaView
import dev.erancihan.justads.ui.components.AdBadge
import dev.erancihan.justads.ui.components.LabelValueRow
import dev.erancihan.justads.ui.components.MetaChip
import dev.erancihan.justads.ui.components.StatTile
import dev.erancihan.justads.ui.format.formatEpochMsUtc
import dev.erancihan.justads.ui.format.formatLatency

/**
 * The home "Gallery": a feed of native ads rendered as inspectable specimens, with the
 * session stat header, on-demand full-screen buttons, and a pinned bottom banner.
 */
@Composable
fun GalleryScreen(
    state: FeedUiState,
    bannerUnitId: String,
    adsReady: Boolean,
    onLoadMore: () -> Unit,
    onRefresh: () -> Unit,
    onEvict: (FeedCard) -> Unit,
    onShowInterstitial: () -> Unit,
    onShowRewarded: () -> Unit,
    onOpenDetail: (AdRecord) -> Unit,
    modifier: Modifier = Modifier,
) {
    val listState = rememberLazyListState()
    val currentState = rememberUpdatedState(state)

    // Page ahead: when the last item scrolls into view — and the last load didn't fail —
    // ask for one more. Driven off snapshotFlow so it re-fires on scroll and on newly
    // measured items, but NOT on the loading->idle transition after a no-fill (which would
    // hot-loop past the backoff). The VM's bounded backoff owns retries.
    LaunchedEffect(listState) {
        snapshotFlow { listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: -1 }
            .distinctUntilChanged()
            .collect { lastVisible ->
                val s = currentState.value
                if (!s.loading && s.error == null && s.items.isNotEmpty() && lastVisible >= s.items.size - 1) {
                    onLoadMore()
                }
            }
    }

    Column(modifier.fillMaxSize()) {
        LazyColumn(
            state = listState,
            modifier = Modifier.weight(1f).fillMaxWidth(),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item { GalleryHeader(state, onRefresh, onShowInterstitial, onShowRewarded) }

            items(state.items, key = { it.key }) { card ->
                NativeAdCardView(card = card, onOpenDetail = { onOpenDetail(card.record) })
            }

            item { FeedFooter(state, onLoadMore) }
        }

        // A banner is a distinct format worth seeing on its own — pinned. Only mounted once
        // the SDK is initialized (and, on the real-ads path, consent obtained) so it never
        // requests an ad before init/consent.
        if (adsReady) {
            Divider()
            BannerAd(unitId = bannerUnitId, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun GalleryHeader(
    state: FeedUiState,
    onRefresh: () -> Unit,
    onShowInterstitial: () -> Unit,
    onShowRewarded: () -> Unit,
) {
    Column {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
            StatTile(state.session.adsSeen.toString(), "ads seen")
            StatTile(state.session.advertisers.toString(), "advertisers")
            StatTile(state.session.networks.toString(), "networks")
            StatTile(state.adsWatched.toString(), "watched")
        }
        Row(
            Modifier.fillMaxWidth().padding(top = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            OutlinedButton(onClick = onShowInterstitial, modifier = Modifier.weight(1f)) { Text("Interstitial") }
            OutlinedButton(onClick = onShowRewarded, modifier = Modifier.weight(1f)) { Text("Rewarded") }
            TextButton(onClick = onRefresh) { Text("Refresh") }
        }
    }
}

@Composable
private fun NativeAdCardView(card: FeedCard, onOpenDetail: () -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    val record = card.record

    Card(Modifier.fillMaxWidth().clickable(onClick = onOpenDetail)) {
        Column(Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                AdBadge()
                Spacer(Modifier.width(8.dp))
                Text(
                    record.advertiserLabel,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                )
            }
            Spacer(Modifier.height(8.dp))

            // The actual native ad, rendered by the platform's native-ad view.
            NativeAdMediaView(handle = card.handle, modifier = Modifier.fillMaxWidth())

            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                MetaChip(record.format.name)
                MetaChip(if (record.personalized) "Personalized" else "Non-personalized")
                MetaChip(formatLatency(record.latencyMs))
            }

            TextButton(onClick = { expanded = !expanded }) {
                Text(if (expanded) "Hide details" else "Inspect")
            }
            if (expanded) {
                LabelValueRow("Filled by", record.filledBy)
                LabelValueRow("Response ID", record.id.ifBlank { "—" })
                LabelValueRow("Loaded at", formatEpochMsUtc(record.loadedAtEpochMs))
                LabelValueRow("Waterfall", "${record.waterfall.size} adapter(s)")
                TextButton(onClick = onOpenDetail) { Text("Full detail →") }
            }
        }
    }
}

@Composable
private fun FeedFooter(state: FeedUiState, onLoadMore: () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        when {
            state.loading -> CircularProgressIndicator()
            state.error != null -> {
                Text("No ad: ${state.error}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                state.nextRetryDelayMs?.let {
                    Text("Retrying in ${it / 1000}s…", style = MaterialTheme.typography.labelSmall)
                }
                Button(onClick = onLoadMore, modifier = Modifier.padding(top = 8.dp)) { Text("Try now") }
            }
            state.items.isEmpty() -> Text("Loading your first ad…", style = MaterialTheme.typography.bodyMedium)
            else -> Button(onClick = onLoadMore) { Text("Load more") }
        }
    }
}
