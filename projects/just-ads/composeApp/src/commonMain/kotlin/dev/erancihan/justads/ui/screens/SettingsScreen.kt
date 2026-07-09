package dev.erancihan.justads.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Divider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.unit.dp
import dev.erancihan.justads.config.AdsConfig
import dev.erancihan.justads.ui.components.SectionHeader

private const val MY_AD_CENTER = "https://myadcenter.google.com"

/** Ad-source toggle (guarded), consent entry point, transparency notes, and about. */
@Composable
fun SettingsScreen(
    config: AdsConfig,
    isPrivacyOptionsRequired: Boolean,
    onManageConsent: () -> Unit,
    appVersion: String,
    platformLabel: String,
    modifier: Modifier = Modifier,
) {
    val uriHandler = LocalUriHandler.current
    var showRealAdsWarning by remember { mutableStateOf(false) }

    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        SectionHeader("Ad source")
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(if (config.useTestAds) "Test ads" else "Real ads", style = MaterialTheme.typography.bodyLarge)
                Text(
                    if (config.useTestAds)
                        "Showing Google's sample ads — safe, but generic placeholders, not ads targeted at you."
                    else
                        "Showing real targeted ads.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Switch(
                checked = !config.useTestAds,
                onCheckedChange = { showRealAdsWarning = true },
            )
        }

        Divider(Modifier.padding(vertical = 12.dp))
        SectionHeader("Privacy & transparency")
        if (isPrivacyOptionsRequired) {
            OutlinedButton(onClick = onManageConsent, modifier = Modifier.padding(bottom = 8.dp)) {
                Text("Manage consent")
            }
        }
        OutlinedButton(onClick = { uriHandler.openUri(MY_AD_CENTER) }) {
            Text("Open Google My Ad Center")
        }
        Text(
            "This app can only show what Google's ad network fills for this app, given your " +
                "ad profile and consent. It's a real slice of your Google ad profile — not every " +
                "ad you see elsewhere. My Ad Center is the authoritative view of that profile.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 8.dp),
        )

        Divider(Modifier.padding(vertical = 12.dp))
        SectionHeader("About")
        Text("JustAds $appVersion", style = MaterialTheme.typography.bodyMedium)
        Text(platformLabel, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
            "Ads by Google Mobile Ads SDK (AdMob).",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 4.dp),
        )
    }

    if (showRealAdsWarning) {
        AlertDialog(
            onDismissRequest = { showRealAdsWarning = false },
            title = { Text("Switch to real ads?") },
            text = {
                Text(
                    "Real ads require real ad unit IDs wired into the build. Viewing your own real " +
                        "ads is invalid traffic by AdMob's rules, and clicking them can get the AdMob " +
                        "account suspended. Only do this on a dedicated/throwaway account, and never " +
                        "click. See README §Real-ads path.",
                )
            },
            confirmButton = { TextButton(onClick = { showRealAdsWarning = false }) { Text("Got it") } },
        )
    }
}
