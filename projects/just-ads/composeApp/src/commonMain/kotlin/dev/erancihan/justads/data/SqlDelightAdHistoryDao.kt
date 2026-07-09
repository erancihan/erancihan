package dev.erancihan.justads.data

import app.cash.sqldelight.coroutines.asFlow
import app.cash.sqldelight.coroutines.mapToList
import dev.erancihan.justads.core.data.AdHistoryDao
import dev.erancihan.justads.core.model.AdFormat
import dev.erancihan.justads.core.model.AdRecord
import dev.erancihan.justads.core.model.AdapterAttempt
import dev.erancihan.justads.core.model.NativeCreative
import dev.erancihan.justads.db.JustAdsDb
import dev.erancihan.justads.db.StoredAd
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/**
 * SQLDelight-backed [AdHistoryDao]. Flat columns; the waterfall and creative are stored
 * as JSON. The [JustAdsDb] is created per platform (Android/native driver) and injected.
 */
class SqlDelightAdHistoryDao(
    private val db: JustAdsDb,
    private val json: Json = Json { ignoreUnknownKeys = true },
) : AdHistoryDao {

    private val queries get() = db.storedAdQueries

    override suspend fun insert(record: AdRecord) = withContext(Dispatchers.Default) {
        queries.insert(
            responseId = record.id,
            format = record.format.name,
            filledBy = record.filledBy,
            personalized = if (record.personalized) 1L else 0L,
            loadedAtEpochMs = record.loadedAtEpochMs,
            latencyMs = record.latencyMs,
            waterfallJson = json.encodeToString(record.waterfall),
            creativeJson = record.creative?.let { json.encodeToString(it) },
            rawResponseDump = record.rawResponseDump,
        )
    }

    override fun observeAll(): Flow<List<AdRecord>> =
        queries.selectAll().asFlow().mapToList(Dispatchers.Default).map { rows -> rows.map(::toModel) }

    override suspend fun all(): List<AdRecord> = withContext(Dispatchers.Default) {
        queries.selectAll().executeAsList().map(::toModel)
    }

    override suspend fun count(): Int = withContext(Dispatchers.Default) {
        queries.count().executeAsOne().toInt()
    }

    override suspend fun clear() = withContext(Dispatchers.Default) {
        queries.clear()
    }

    private fun toModel(row: StoredAd): AdRecord = AdRecord(
        id = row.responseId,
        format = runCatching { AdFormat.valueOf(row.format) }.getOrDefault(AdFormat.NATIVE),
        filledBy = row.filledBy,
        personalized = row.personalized != 0L,
        loadedAtEpochMs = row.loadedAtEpochMs,
        latencyMs = row.latencyMs,
        waterfall = json.decodeFromString<List<AdapterAttempt>>(row.waterfallJson),
        creative = row.creativeJson?.let { json.decodeFromString<NativeCreative>(it) },
        rawResponseDump = row.rawResponseDump,
    )
}
