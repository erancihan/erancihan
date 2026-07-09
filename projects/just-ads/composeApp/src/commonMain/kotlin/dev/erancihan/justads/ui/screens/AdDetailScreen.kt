package dev.erancihan.justads.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import dev.erancihan.justads.core.model.AdRecord
import dev.erancihan.justads.ui.components.LabelValueRow
import dev.erancihan.justads.ui.components.SectionHeader
import dev.erancihan.justads.ui.format.formatEpochMsUtc
import dev.erancihan.justads.ui.format.formatLatency
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val prettyJson = Json { prettyPrint = true }

/** Full inspection of a single [AdRecord]: metadata, creative, waterfall, and raw dump. */
@Composable
fun AdDetailScreen(record: AdRecord, modifier: Modifier = Modifier) {
    val clipboard = LocalClipboardManager.current
    val uriHandler = LocalUriHandler.current
    val json = remember(record) { prettyJson.encodeToString(record) }

    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        SectionHeader("Response")
        LabelValueRow("Format", record.format.name)
        LabelValueRow("Filled by", record.filledBy)
        LabelValueRow("Response ID", record.id.ifBlank { "—" })
        LabelValueRow("Personalized", if (record.personalized) "Yes" else "No")
        LabelValueRow("Latency", formatLatency(record.latencyMs))
        LabelValueRow("Loaded at", formatEpochMsUtc(record.loadedAtEpochMs))

        record.creative?.let { c ->
            SectionHeader("Creative")
            c.advertiser?.let { LabelValueRow("Advertiser", it) }
            c.headline?.let { LabelValueRow("Headline", it) }
            c.body?.let { LabelValueRow("Body", it) }
            c.callToAction?.let { LabelValueRow("Call to action", it) }
            c.store?.let { LabelValueRow("Store", it) }
            c.price?.let { LabelValueRow("Price", it) }
            c.starRating?.let { LabelValueRow("Rating", it.toString()) }
            c.adChoicesUrl?.let { url ->
                OutlinedButton(onClick = { uriHandler.openUri(url) }, modifier = Modifier.padding(top = 8.dp)) {
                    Text("Open AdChoices / advertiser info")
                }
            }
        }

        SectionHeader("Mediation waterfall")
        if (record.waterfall.isEmpty()) {
            Text("No waterfall reported.", style = MaterialTheme.typography.bodySmall)
        } else {
            record.waterfall.forEachIndexed { i, attempt ->
                Card(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                    Column(Modifier.padding(10.dp)) {
                        Text(
                            "${i + 1}. ${attempt.adSourceName}${if (attempt.filled) "  ✓ filled" else ""}",
                            style = MaterialTheme.typography.bodyMedium,
                        )
                        LabelValueRow("Latency", formatLatency(attempt.latencyMs))
                        attempt.error?.let { LabelValueRow("Result", it) }
                    }
                }
            }
        }

        SectionHeader("Raw response (nerd view)")
        Card(Modifier.fillMaxWidth().padding(top = 4.dp)) {
            Text(
                text = json,
                style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
                modifier = Modifier.padding(10.dp),
            )
        }
        Row(Modifier.fillMaxWidth().padding(top = 8.dp)) {
            OutlinedButton(onClick = { clipboard.setText(AnnotatedString(json)) }) { Text("Copy JSON") }
        }
    }
}
