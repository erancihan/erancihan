package dev.erancihan.justads.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dev.erancihan.justads.core.model.AdFormat
import dev.erancihan.justads.core.model.AdRecord
import dev.erancihan.justads.ui.components.EmptyState
import dev.erancihan.justads.ui.components.MetaChip
import dev.erancihan.justads.ui.format.formatEpochMsUtc

/** The persisted log of every ad served to this device, newest-first, with a format filter. */
@Composable
fun HistoryScreen(
    records: List<AdRecord>,
    onOpenDetail: (AdRecord) -> Unit,
    onClear: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var filter by remember { mutableStateOf<AdFormat?>(null) }
    var confirmClear by remember { mutableStateOf(false) }

    val filtered = remember(records, filter) {
        filter?.let { f -> records.filter { it.format == f } } ?: records
    }

    Column(modifier.fillMaxSize().padding(horizontal = 12.dp)) {
        Row(
            Modifier.fillMaxWidth().padding(vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            FilterChip(selected = filter == null, onClick = { filter = null }, label = { Text("All") })
            AdFormat.entries.forEach { f ->
                FilterChip(
                    selected = filter == f,
                    onClick = { filter = if (filter == f) null else f },
                    label = { Text(f.name.lowercase().replaceFirstChar { it.uppercase() }) },
                )
            }
        }

        if (records.isNotEmpty()) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("${filtered.size} of ${records.size}", style = MaterialTheme.typography.labelMedium)
                TextButton(onClick = { confirmClear = true }) { Text("Clear history") }
            }
        }

        if (records.isEmpty()) {
            EmptyState("No ads recorded yet", "Ads you see in the Gallery are logged here so you can review what's been served to you over time.")
            return@Column
        }

        LazyColumn(
            Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(vertical = 8.dp),
        ) {
            items(filtered, key = { it.id + it.loadedAtEpochMs.toString() }) { record ->
                HistoryRow(record, onClick = { onOpenDetail(record) })
            }
        }
    }

    if (confirmClear) {
        AlertDialog(
            onDismissRequest = { confirmClear = false },
            title = { Text("Clear all history?") },
            text = { Text("This permanently deletes every recorded ad. It cannot be undone.") },
            confirmButton = {
                TextButton(onClick = { confirmClear = false; onClear() }) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { confirmClear = false }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun HistoryRow(record: AdRecord, onClick: () -> Unit) {
    Card(Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Column(Modifier.padding(12.dp)) {
            Text(record.advertiserLabel, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
            Text(
                formatEpochMsUtc(record.loadedAtEpochMs),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(Modifier.padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                MetaChip(record.format.name)
                MetaChip(record.filledBy)
                if (record.personalized) MetaChip("Personalized")
            }
        }
    }
}
