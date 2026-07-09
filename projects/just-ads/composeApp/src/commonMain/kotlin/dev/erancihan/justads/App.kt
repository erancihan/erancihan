package dev.erancihan.justads

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ViewAgenda
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import dev.erancihan.justads.core.ads.AdsInitState
import dev.erancihan.justads.di.AppDependencies
import dev.erancihan.justads.di.BuildInfo
import dev.erancihan.justads.ui.PlatformBackHandler
import dev.erancihan.justads.ui.navigation.Navigator
import dev.erancihan.justads.ui.navigation.Screen
import dev.erancihan.justads.ui.navigation.Tab
import dev.erancihan.justads.ui.screens.AdDetailScreen
import dev.erancihan.justads.ui.screens.GalleryScreen
import dev.erancihan.justads.ui.screens.HistoryScreen
import dev.erancihan.justads.ui.screens.SettingsScreen
import dev.erancihan.justads.ui.screens.StatsScreen
import dev.erancihan.justads.ui.theme.JustAdsTheme
import dev.erancihan.justads.ui.viewmodel.FeedViewModel
import dev.erancihan.justads.ui.viewmodel.HistoryViewModel
import dev.erancihan.justads.ui.viewmodel.StatsViewModel

/** Root of the shared UI. Both platforms call this with their assembled [AppDependencies]. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun App(deps: AppDependencies) {
    JustAdsTheme {
        val navigator = remember { Navigator() }
        val snackbarHostState = remember { SnackbarHostState() }

        PlatformBackHandler(enabled = navigator.canGoBack) { navigator.back() }

        val feedVm: FeedViewModel = viewModel { FeedViewModel(deps) }
        val historyVm: HistoryViewModel = viewModel { HistoryViewModel(deps) }
        val statsVm: StatsViewModel = viewModel { StatsViewModel(deps) }

        LaunchedEffect(Unit) {
            feedVm.messages.collect { snackbarHostState.showSnackbar(it) }
        }

        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) },
            topBar = {
                TopAppBar(
                    title = { Text(titleFor(navigator.current)) },
                    navigationIcon = {
                        if (navigator.canGoBack) {
                            IconButton(onClick = { navigator.back() }) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                            }
                        }
                    },
                )
            },
            bottomBar = {
                NavigationBar {
                    Tab.entries.forEach { tab ->
                        NavigationBarItem(
                            selected = navigator.currentTab == tab,
                            onClick = { navigator.selectTab(tab) },
                            icon = { Icon(iconFor(tab), contentDescription = tab.label) },
                            label = { Text(tab.label) },
                        )
                    }
                }
            },
        ) { padding ->
            Box(Modifier.padding(padding)) {
                when (val screen = navigator.current) {
                    Screen.Gallery -> {
                        val state by feedVm.state.collectAsStateWithLifecycle()
                        val adsInit by feedVm.initState.collectAsStateWithLifecycle()
                        GalleryScreen(
                            state = state,
                            bannerUnitId = deps.config.bannerUnitId,
                            adsReady = adsInit is AdsInitState.Ready,
                            onLoadMore = { feedVm.loadMore() },
                            onRefresh = { feedVm.refresh() },
                            onEvict = { feedVm.evict(it) },
                            onShowInterstitial = { feedVm.requestInterstitial() },
                            onShowRewarded = { feedVm.requestRewarded() },
                            onOpenDetail = { navigator.push(Screen.AdDetail(it)) },
                        )
                    }

                    Screen.History -> {
                        val records by historyVm.records.collectAsStateWithLifecycle()
                        HistoryScreen(
                            records = records,
                            onOpenDetail = { navigator.push(Screen.AdDetail(it)) },
                            onClear = { historyVm.clearHistory() },
                        )
                    }

                    Screen.Stats -> {
                        val stats by statsVm.stats.collectAsStateWithLifecycle()
                        StatsScreen(stats)
                    }

                    Screen.Settings -> SettingsScreen(
                        config = deps.config,
                        isPrivacyOptionsRequired = deps.consent.isPrivacyOptionsRequired,
                        onManageConsent = { deps.consent.showPrivacyOptions() },
                        appVersion = BuildInfo.VERSION,
                        platformLabel = deps.platformLabel,
                    )

                    is Screen.AdDetail -> AdDetailScreen(screen.record)
                }
            }
        }
    }
}

private fun titleFor(screen: Screen): String = when (screen) {
    Screen.Gallery -> "JustAds"
    Screen.History -> "History"
    Screen.Stats -> "Stats"
    Screen.Settings -> "Settings"
    is Screen.AdDetail -> "Ad detail"
}

private fun iconFor(tab: Tab) = when (tab) {
    Tab.GALLERY -> Icons.Filled.ViewAgenda
    Tab.HISTORY -> Icons.Filled.History
    Tab.STATS -> Icons.Filled.BarChart
    Tab.SETTINGS -> Icons.Filled.Settings
}
