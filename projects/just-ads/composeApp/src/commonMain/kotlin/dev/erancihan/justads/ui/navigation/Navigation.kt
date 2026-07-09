package dev.erancihan.justads.ui.navigation

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import dev.erancihan.justads.core.model.AdRecord

/** App destinations. Detail carries its record directly (no serialized nav args). */
sealed interface Screen {
    data object Gallery : Screen
    data object History : Screen
    data object Stats : Screen
    data object Settings : Screen
    data class AdDetail(val record: AdRecord) : Screen
}

/** The four bottom-nav tabs, in order. */
enum class Tab(val screen: Screen, val label: String) {
    GALLERY(Screen.Gallery, "Gallery"),
    HISTORY(Screen.History, "History"),
    STATS(Screen.Stats, "Stats"),
    SETTINGS(Screen.Settings, "Settings"),
}

/**
 * Minimal navigator: a current screen plus a one-level push stack for AdDetail. Bottom-tab
 * selection replaces the root; opening a detail pushes; back pops to the previous root.
 * (PLAN.md §5.6 — the app is small enough not to need a nav library.)
 */
class Navigator {
    var current: Screen by mutableStateOf(Screen.Gallery)
        private set

    // Snapshot-backed so `canGoBack` is a tracked read — composables that observe only it
    // (the TopAppBar back icon, the hardware BackHandler) recompose when the stack changes.
    private val backStack = mutableStateListOf<Screen>()

    val canGoBack: Boolean get() = backStack.isNotEmpty()

    /** Select a top-level tab; clears any pushed detail. */
    fun selectTab(tab: Tab) {
        backStack.clear()
        current = tab.screen
    }

    /** Push a detail screen over the current root. */
    fun push(screen: Screen) {
        backStack.add(current)
        current = screen
    }

    /** Pop back. Returns false if there was nothing to pop (caller may exit the app). */
    fun back(): Boolean {
        val previous = backStack.removeLastOrNull() ?: return false
        current = previous
        return true
    }

    val currentTab: Tab?
        get() = Tab.entries.firstOrNull { it.screen == current }
}
