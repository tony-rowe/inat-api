import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNW_BOUNDS } from './location-filter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'cache.db');

let db;

async function initDb() {
  const fs = await import('fs');
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('cache_size = -64000');
  db.pragma('synchronous = NORMAL');
  db.pragma('temp_store = MEMORY');

  db.exec(`
    CREATE TABLE IF NOT EXISTS api_cache (
      cache_key TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      ttl INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cache_created ON api_cache(created_at);

    CREATE TABLE IF NOT EXISTS observations (
      id INTEGER PRIMARY KEY,
      taxon_id INTEGER NOT NULL,
      species_guess TEXT,
      quality_grade TEXT,
      latitude REAL,
      longitude REAL,
      observed_on TEXT,
      place_guess TEXT,
      photo_url TEXT,
      user_login TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_obs_taxon ON observations(taxon_id);
    CREATE INDEX IF NOT EXISTS idx_obs_date ON observations(observed_on);
    CREATE INDEX IF NOT EXISTS idx_obs_quality ON observations(quality_grade);

    CREATE TABLE IF NOT EXISTS sync_status (
      taxon_id INTEGER PRIMARY KEY,
      last_sync INTEGER NOT NULL,
      total_fetched INTEGER DEFAULT 0,
      page_count INTEGER DEFAULT 0
    );
  `);

  return db;
}

function getCached(key, maxAgeSec = 3600) {
  const row = db.prepare(
    'SELECT data, created_at, ttl FROM api_cache WHERE cache_key = ?'
  ).get(key);
  if (!row) return null;
  const age = (Date.now() / 1000) - row.created_at;
  if (age > (row.ttl || maxAgeSec)) return null;
  return JSON.parse(row.data);
}

function setCache(key, data, ttlSec = 3600) {
  db.prepare(
    'INSERT OR REPLACE INTO api_cache (cache_key, data, created_at, ttl) VALUES (?, ?, ?, ?)'
  ).run(key, JSON.stringify(data), Math.floor(Date.now() / 1000), ttlSec);
}

function upsertObservations(observations) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO observations
    (id, taxon_id, species_guess, quality_grade, latitude, longitude, observed_on, place_guess, photo_url, user_login, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const upsertMany = db.transaction((obs) => {
    for (const o of obs) {
      stmt.run(
        o.id, o.taxon_id, o.species_guess, o.quality_grade,
        o.latitude, o.longitude, o.observed_on, o.place_guess,
        o.photo_url, o.user_login, o.created_at, o.updated_at
      );
    }
  });

  upsertMany(observations);
}

function replaceObservationsForTaxon(taxonId, observations) {
  const rows = Array.isArray(observations) ? observations : [];
  if (rows.length === 0) {
    db.prepare('DELETE FROM observations WHERE taxon_id = ?').run(taxonId);
    return;
  }

  const upsertStmt = db.prepare(`
    INSERT OR REPLACE INTO observations
    (id, taxon_id, species_guess, quality_grade, latitude, longitude, observed_on, place_guess, photo_url, user_login, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  db.exec('CREATE TEMP TABLE IF NOT EXISTS sync_ids (id INTEGER PRIMARY KEY)');
  const insertSyncIdStmt = db.prepare('INSERT OR IGNORE INTO sync_ids (id) VALUES (?)');
  const clearSyncIdsStmt = db.prepare('DELETE FROM sync_ids');
  const pruneStmt = db.prepare(
    'DELETE FROM observations WHERE taxon_id = ? AND id NOT IN (SELECT id FROM sync_ids)'
  );

  const replaceTxn = db.transaction((taxon, obsRows) => {
    clearSyncIdsStmt.run();

    for (const o of obsRows) {
      if (!o?.id) continue;
      upsertStmt.run(
        o.id, o.taxon_id, o.species_guess, o.quality_grade,
        o.latitude, o.longitude, o.observed_on, o.place_guess,
        o.photo_url, o.user_login, o.created_at, o.updated_at
      );
      insertSyncIdStmt.run(o.id);
    }

    pruneStmt.run(taxon);
  });

  replaceTxn(taxonId, rows);
}

function getObservationsForTaxon(taxonId) {
  return db.prepare('SELECT * FROM observations WHERE taxon_id = ? ORDER BY observed_on DESC').all(taxonId);
}

function getAllObservations() {
  return db.prepare('SELECT * FROM observations ORDER BY observed_on DESC').all();
}

function getObservationStats(taxonId) {
  const total = db.prepare('SELECT COUNT(*) as count FROM observations WHERE taxon_id = ?').get(taxonId);
  const byQuality = db.prepare(
    'SELECT quality_grade, COUNT(*) as count FROM observations WHERE taxon_id = ? GROUP BY quality_grade'
  ).all(taxonId);
  const byMonth = db.prepare(
    `SELECT CAST(strftime('%m', observed_on) AS INTEGER) as month, COUNT(*) as count
     FROM observations WHERE taxon_id = ? AND observed_on IS NOT NULL
     GROUP BY month ORDER BY month`
  ).all(taxonId);
  const byYear = db.prepare(
    `SELECT strftime('%Y', observed_on) as year, COUNT(*) as count
     FROM observations WHERE taxon_id = ? AND observed_on IS NOT NULL
     GROUP BY year ORDER BY year`
  ).all(taxonId);
  const recentObs = db.prepare(
    'SELECT * FROM observations WHERE taxon_id = ? ORDER BY observed_on DESC LIMIT 20'
  ).all(taxonId);

  return { total: total.count, byQuality, byMonth, byYear, recentObs };
}

function getGlobalStats() {
  const totalObs = db.prepare('SELECT COUNT(*) as count FROM observations').get();
  const totalSpecies = db.prepare('SELECT COUNT(DISTINCT taxon_id) as count FROM observations').get();
  const byMonth = db.prepare(
    `SELECT CAST(strftime('%m', observed_on) AS INTEGER) as month, COUNT(*) as count
     FROM observations WHERE observed_on IS NOT NULL GROUP BY month ORDER BY month`
  ).all();
  const recentObs = db.prepare(
    'SELECT * FROM observations ORDER BY observed_on DESC LIMIT 30'
  ).all();
  return { totalObs: totalObs.count, totalSpecies: totalSpecies.count, byMonth, recentObs };
}

function getSyncStatus(taxonId) {
  return db.prepare('SELECT * FROM sync_status WHERE taxon_id = ?').get(taxonId);
}

function updateSyncStatus(taxonId, totalFetched, pageCount) {
  db.prepare(
    'INSERT OR REPLACE INTO sync_status (taxon_id, last_sync, total_fetched, page_count) VALUES (?, ?, ?, ?)'
  ).run(taxonId, Math.floor(Date.now() / 1000), totalFetched, pageCount);
}

function getHeatmapData(taxonId, onlyPnw = true) {
  const pnwClause = onlyPnw
    ? ` AND latitude BETWEEN ${PNW_BOUNDS.minLatitude} AND ${PNW_BOUNDS.maxLatitude}
        AND longitude BETWEEN ${PNW_BOUNDS.minLongitude} AND ${PNW_BOUNDS.maxLongitude}`
    : '';
  const query = taxonId
    ? `SELECT latitude, longitude FROM observations
       WHERE taxon_id = ?
       AND latitude IS NOT NULL AND longitude IS NOT NULL${pnwClause}`
    : `SELECT latitude, longitude FROM observations
       WHERE latitude IS NOT NULL AND longitude IS NOT NULL${pnwClause}`;
  const params = taxonId ? [taxonId] : [];
  return db.prepare(query).all(...params);
}

function clearCache() {
  db.exec('DELETE FROM api_cache');
}

function getRollingObservationReport(days = 35, window = 7, taxonId = null) {
  const safeDays = Math.max(7, Math.min(days, 365));
  const safeWindow = Math.max(2, Math.min(window, safeDays));

  const params = [];
  let where = `observed_on IS NOT NULL AND date(observed_on) >= date('now', '-${safeDays - 1} days')`;
  if (taxonId) {
    where += ' AND taxon_id = ?';
    params.push(taxonId);
  }

  const rows = db.prepare(
    `SELECT date(observed_on) as day, COUNT(*) as count
     FROM observations
     WHERE ${where}
     GROUP BY day
     ORDER BY day ASC`
  ).all(...params);

  const countByDay = new Map(rows.map(r => [r.day, r.count]));
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (safeDays - 1));

  const series = [];
  const rollingBuffer = [];
  let rollingTotal = 0;
  for (let i = 0; i < safeDays; i++) {
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + i);
    const day = current.toISOString().slice(0, 10);
    const count = countByDay.get(day) || 0;

    rollingBuffer.push(count);
    rollingTotal += count;
    if (rollingBuffer.length > safeWindow) {
      rollingTotal -= rollingBuffer.shift();
    }

    series.push({
      day,
      count,
      rolling: rollingTotal,
      rollingWindow: safeWindow
    });
  }

  return { days: safeDays, window: safeWindow, series };
}

function getRecentWindowSummary(days = 7, taxonId = null) {
  const safeDays = Math.max(1, Math.min(days, 90));
  const params = [];
  let where = `observed_on IS NOT NULL AND date(observed_on) >= date('now', '-${safeDays - 1} days')`;
  if (taxonId) {
    where += ' AND taxon_id = ?';
    params.push(taxonId);
  }

  const total = db.prepare(
    `SELECT COUNT(*) as count
     FROM observations
     WHERE ${where}`
  ).get(...params)?.count || 0;

  const byQuality = db.prepare(
    `SELECT quality_grade, COUNT(*) as count
     FROM observations
     WHERE ${where}
     GROUP BY quality_grade
     ORDER BY count DESC`
  ).all(...params);

  const topTaxa = db.prepare(
    `SELECT taxon_id, COUNT(*) as count
     FROM observations
     WHERE ${where}
     GROUP BY taxon_id
     ORDER BY count DESC
     LIMIT 15`
  ).all(...params);

  return { days: safeDays, total, byQuality, topTaxa };
}

function getCacheStatus() {
  const observations = db.prepare('SELECT COUNT(*) as count FROM observations').get()?.count || 0;
  const trackedTaxa = db.prepare('SELECT COUNT(DISTINCT taxon_id) as count FROM observations').get()?.count || 0;
  const apiEntries = db.prepare('SELECT COUNT(*) as count FROM api_cache').get()?.count || 0;
  const syncedTaxa = db.prepare('SELECT COUNT(*) as count FROM sync_status').get()?.count || 0;
  const latestObservation = db.prepare('SELECT MAX(observed_on) as observed_on FROM observations').get()?.observed_on || null;
  const latestSyncEpoch = db.prepare('SELECT MAX(last_sync) as last_sync FROM sync_status').get()?.last_sync || null;
  const dbSizeBytes = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).size : 0;

  return {
    dbPath: DB_PATH,
    dbSizeBytes,
    dbSizeMb: Number((dbSizeBytes / (1024 * 1024)).toFixed(2)),
    observations,
    trackedTaxa,
    apiEntries,
    syncedTaxa,
    latestObservation,
    latestSync: latestSyncEpoch ? new Date(latestSyncEpoch * 1000).toISOString() : null
  };
}

function getOutOfRegionSummary() {
  const total = db.prepare('SELECT COUNT(*) as count FROM observations').get()?.count || 0;
  const withCoordinates = db.prepare(
    'SELECT COUNT(*) as count FROM observations WHERE latitude IS NOT NULL AND longitude IS NOT NULL'
  ).get()?.count || 0;

  const outOfRegion = db.prepare(
    `SELECT COUNT(*) as count
     FROM observations
     WHERE latitude IS NOT NULL AND longitude IS NOT NULL
       AND NOT (
         latitude BETWEEN ? AND ?
         AND longitude BETWEEN ? AND ?
       )`
  ).get(
    PNW_BOUNDS.minLatitude,
    PNW_BOUNDS.maxLatitude,
    PNW_BOUNDS.minLongitude,
    PNW_BOUNDS.maxLongitude
  )?.count || 0;

  const inRegion = Math.max(withCoordinates - outOfRegion, 0);
  const noCoordinates = Math.max(total - withCoordinates, 0);

  const samples = db.prepare(
    `SELECT id, taxon_id, place_guess, latitude, longitude, observed_on
     FROM observations
     WHERE latitude IS NOT NULL AND longitude IS NOT NULL
       AND NOT (
         latitude BETWEEN ? AND ?
         AND longitude BETWEEN ? AND ?
       )
     ORDER BY observed_on DESC
     LIMIT 20`
  ).all(
    PNW_BOUNDS.minLatitude,
    PNW_BOUNDS.maxLatitude,
    PNW_BOUNDS.minLongitude,
    PNW_BOUNDS.maxLongitude
  );

  return {
    bounds: PNW_BOUNDS,
    total,
    withCoordinates,
    inRegion,
    outOfRegion,
    noCoordinates,
    samples
  };
}

function pruneOutOfRegionObservations() {
  const before = getOutOfRegionSummary();
  const result = db.prepare(
    `DELETE FROM observations
     WHERE latitude IS NOT NULL AND longitude IS NOT NULL
       AND NOT (
         latitude BETWEEN ? AND ?
         AND longitude BETWEEN ? AND ?
       )`
  ).run(
    PNW_BOUNDS.minLatitude,
    PNW_BOUNDS.maxLatitude,
    PNW_BOUNDS.minLongitude,
    PNW_BOUNDS.maxLongitude
  );

  const after = getOutOfRegionSummary();
  return {
    deleted: result.changes || 0,
    before,
    after
  };
}

export {
  initDb,
  getCached,
  setCache,
  upsertObservations,
  replaceObservationsForTaxon,
  getObservationsForTaxon,
  getAllObservations,
  getObservationStats,
  getGlobalStats,
  getSyncStatus,
  updateSyncStatus,
  getHeatmapData,
  getRollingObservationReport,
  getRecentWindowSummary,
  getCacheStatus,
  getOutOfRegionSummary,
  pruneOutOfRegionObservations,
  clearCache
};
