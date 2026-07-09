package dev.erancihan.justads.core.data

import dev.erancihan.justads.core.model.AdRecord
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map

/**
 * Persistence for the ad-history log. Real impl is SQLDelight-backed (PLAN.md §5.5, M4);
 * [InMemoryAdHistoryDao] is used by the test-ads build's fallback and by every unit test.
 * Records are always observed newest-first.
 */
interface AdHistoryDao {
    suspend fun insert(record: AdRecord)
    fun observeAll(): Flow<List<AdRecord>>
    suspend fun all(): List<AdRecord>
    suspend fun count(): Int
    suspend fun clear()
}

/** Thread-confined in-memory history (single dispatcher). Newest-first ordering. */
class InMemoryAdHistoryDao : AdHistoryDao {
    // Kept newest-first internally so observeAll/all need no re-sort.
    private val backing = MutableStateFlow<List<AdRecord>>(emptyList())

    override suspend fun insert(record: AdRecord) {
        backing.value = listOf(record) + backing.value
    }

    override fun observeAll(): Flow<List<AdRecord>> = backing.map { it }

    override suspend fun all(): List<AdRecord> = backing.value

    override suspend fun count(): Int = backing.value.size

    override suspend fun clear() {
        backing.value = emptyList()
    }
}
