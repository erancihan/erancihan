package dev.erancihan.justads.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dev.erancihan.justads.core.model.AdRecord
import dev.erancihan.justads.core.model.AdStats
import dev.erancihan.justads.di.AppDependencies
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/** Backs the History screen: the full persisted log, newest-first, plus wipe. */
class HistoryViewModel(private val deps: AppDependencies) : ViewModel() {
    val records: StateFlow<List<AdRecord>> = deps.history.observeAll()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun clearHistory() = viewModelScope.launch { deps.history.clear() }
}

/** Backs the Stats screen: aggregates derived from the same history flow. */
class StatsViewModel(deps: AppDependencies) : ViewModel() {
    val stats: StateFlow<AdStats> = deps.history.observeAll()
        .map { AdStats.from(it) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), AdStats.EMPTY)
}
