package dev.erancihan.justads.core

import dev.erancihan.justads.core.data.InMemoryAdHistoryDao
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals

class AdHistoryDaoTest {
    @Test
    fun inserts_are_observed_newest_first() = runTest {
        val dao = InMemoryAdHistoryDao()
        dao.insert(adRecord(id = "old"))
        dao.insert(adRecord(id = "mid"))
        dao.insert(adRecord(id = "new"))

        assertEquals(listOf("new", "mid", "old"), dao.all().map { it.id })
        assertEquals(listOf("new", "mid", "old"), dao.observeAll().first().map { it.id })
        assertEquals(3, dao.count())
    }

    @Test
    fun clear_empties_history() = runTest {
        val dao = InMemoryAdHistoryDao()
        dao.insert(adRecord(id = "a"))
        dao.clear()
        assertEquals(0, dao.count())
        assertEquals(emptyList(), dao.all())
    }
}
