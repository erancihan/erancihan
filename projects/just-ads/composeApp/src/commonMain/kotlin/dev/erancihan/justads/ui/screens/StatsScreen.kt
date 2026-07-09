package dev.erancihan.justads.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import dev.erancihan.justads.core.model.AdStats
import dev.erancihan.justads.core.model.LabelCount
import dev.erancihan.justads.ui.components.EmptyState
import dev.erancihan.justads.ui.components.ProportionBar
import dev.erancihan.justads.ui.components.SectionHeader
import dev.erancihan.justads.ui.components.StatTile
import dev.erancihan.justads.ui.format.formatPercent

/** Aggregate view over the whole history — the "what pattern is being served to me" screen. */
@Composable
fun StatsScreen(stats: AdStats, modifier: Modifier = Modifier) {
    if (stats.total == 0) {
        EmptyState("No stats yet", "Once ads are recorded, this screen summarizes who's advertising to you and how.")
        return
    }

    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
            StatTile(stats.total.toString(), "ads")
            StatTile(stats.distinctAdvertisers.toString(), "advertisers")
            StatTile(stats.distinctNetworks.toString(), "networks")
        }

        SectionHeader("Personalized")
        Text(
            "${stats.personalizedCount} of ${stats.total} (${formatPercent(stats.personalizedRatio)})",
            style = MaterialTheme.typography.bodyMedium,
        )
        ProportionBar(stats.personalizedRatio, Modifier.padding(top = 4.dp))

        SectionHeader("Top advertisers")
        RankedList(stats.topAdvertisers, stats.total)

        SectionHeader("Top networks")
        RankedList(stats.topNetworks, stats.total)

        SectionHeader("By format")
        stats.byFormat.entries.sortedByDescending { it.value }.forEach { (format, count) ->
            LabeledBar(format.name, count, stats.total)
        }

        SectionHeader("Per day (UTC)")
        Card(Modifier.fillMaxWidth().padding(top = 4.dp)) {
            Column(Modifier.padding(12.dp)) {
                val maxDay = stats.perDay.maxOfOrNull { it.count } ?: 1
                stats.perDay.takeLast(14).forEach { day ->
                    LabeledBar("day ${day.epochDay}", day.count, maxDay)
                }
            }
        }
    }
}

@Composable
private fun RankedList(items: List<LabelCount>, total: Int) {
    if (items.isEmpty()) {
        Text("—", style = MaterialTheme.typography.bodySmall)
        return
    }
    items.forEach { LabeledBar(it.label, it.count, total) }
}

@Composable
private fun LabeledBar(label: String, count: Int, denominator: Int) {
    val fraction = if (denominator <= 0) 0.0 else count.toDouble() / denominator
    Column(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, style = MaterialTheme.typography.bodySmall, maxLines = 1)
            Text(count.toString(), style = MaterialTheme.typography.labelMedium)
        }
        ProportionBar(fraction, Modifier.padding(top = 2.dp))
    }
}
