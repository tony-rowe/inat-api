import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNW_PLACE_IDS } from './species.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'cache.db');
const API_BASE = 'https://api.inaturalist.org/v1';
const RATE_MS = 1100;
const PLACE_IDS = PNW_PLACE_IDS.join(',');
const PAGES_PER_SPECIES = 3;
const PER_PAGE = 100;
const MAX_PHOTOS_PER_SPECIES = 50;

let lastReq = 0;

async function rateFetch(url) {
  const now = Date.now();
  if (now - lastReq < RATE_MS) await new Promise(r => setTimeout(r, RATE_MS - (now - lastReq)));
  lastReq = Date.now();
  const res = await fetch(url, { headers: { 'User-Agent': 'PNW-Forager-Dashboard/1.0' } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function getDb() {
  return new Database(DB_PATH);
}

function ensurePhotoTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS cached_photos (
      id INTEGER PRIMARY KEY,
      taxon_id INTEGER NOT NULL,
      observation_id INTEGER,
      url_square TEXT,
      url_medium TEXT,
      url_large TEXT,
      url_original TEXT,
      attribution TEXT,
      license TEXT,
      observed_on TEXT,
      place_guess TEXT,
      quality_grade TEXT,
      user_login TEXT,
      UNIQUE(id)
    );
    CREATE INDEX IF NOT EXISTS idx_photos_taxon ON cached_photos(taxon_id);

    CREATE TABLE IF NOT EXISTS photo_sync_status (
      taxon_id INTEGER PRIMARY KEY,
      last_sync INTEGER NOT NULL,
      photo_count INTEGER DEFAULT 0,
      pages_fetched INTEGER DEFAULT 0
    );
  `);
  db.close();
}

function getPhotoSyncStatus(taxonId) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM photo_sync_status WHERE taxon_id = ?').get(taxonId);
  db.close();
  return row;
}

function getCachedPhotoCount(taxonId) {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM cached_photos WHERE taxon_id = ?').get(taxonId);
  db.close();
  return row?.count || 0;
}

function trimPhotos(taxonId, keep = MAX_PHOTOS_PER_SPECIES) {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as c FROM cached_photos WHERE taxon_id = ?').get(taxonId)?.c || 0;
  if (count > keep) {
    db.prepare(`
      DELETE FROM cached_photos WHERE taxon_id = ? AND id NOT IN (
        SELECT id FROM cached_photos WHERE taxon_id = ? AND quality_grade = 'research'
        ORDER BY id DESC LIMIT ?
      )
    `).run(taxonId, taxonId, keep);
    const after = db.prepare('SELECT COUNT(*) as c FROM cached_photos WHERE taxon_id = ?').get(taxonId)?.c || 0;
    if (after > keep) {
      db.prepare(`
        DELETE FROM cached_photos WHERE taxon_id = ? AND id NOT IN (
          SELECT id FROM cached_photos WHERE taxon_id = ? ORDER BY id DESC LIMIT ?
        )
      `).run(taxonId, taxonId, keep);
    }
  }
  db.close();
}

function trimAllPhotos(speciesList) {
  for (const s of speciesList) {
    trimPhotos(s.taxonId);
  }
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as c FROM cached_photos').get()?.c || 0;
  db.close();
  return total;
}

function getCachedPhotos(taxonId, limit = 200) {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM cached_photos WHERE taxon_id = ? ORDER BY RANDOM() LIMIT ?'
  ).all(taxonId, limit);
  db.close();
  return rows;
}

function getAllPhotoStats() {
  const db = getDb();
  const rows = db.prepare(
    'SELECT taxon_id, COUNT(*) as count FROM cached_photos GROUP BY taxon_id ORDER BY count DESC'
  ).all();
  const total = db.prepare('SELECT COUNT(*) as count FROM cached_photos').get();
  db.close();
  return { perSpecies: rows, totalPhotos: total?.count || 0 };
}

async function syncPhotosForSpecies(taxonId, maxPages = PAGES_PER_SPECIES) {
  const status = getPhotoSyncStatus(taxonId);
  const now = Math.floor(Date.now() / 1000);
  if (status && (now - status.last_sync) < 3600 && status.photo_count > 50) {
    return { synced: false, cached: true, count: status.photo_count };
  }

  const db = getDb();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO cached_photos
    (id, taxon_id, observation_id, url_square, url_medium, url_large, url_original,
     attribution, license, observed_on, place_guess, quality_grade, user_login)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalInserted = 0;
  let pagesActual = 0;

  const sortOrders = [
    { order_by: 'votes', order: 'desc' },
    { order_by: 'observed_on', order: 'desc' },
    { order_by: 'created_at', order: 'desc' },
    { order_by: 'observed_on', order: 'asc' },
    { order_by: 'id', order: 'desc' }
  ];

  for (let page = 1; page <= maxPages; page++) {
    const sortIdx = Math.min(Math.floor((page - 1) / 2), sortOrders.length - 1);
    const sort = sortOrders[sortIdx];
    const url = `${API_BASE}/observations?taxon_id=${taxonId}&place_id=${PLACE_IDS}&photos=true&quality_grade=research,needs_id&per_page=${PER_PAGE}&page=${page}&order_by=${sort.order_by}&order=${sort.order}`;

    try {
      const data = await rateFetch(url);
      const results = data.results || [];
      if (results.length === 0) break;

      const insertMany = db.transaction((rows) => {
        for (const r of rows) insert.run(...r);
      });

      const rows = [];
      for (const obs of results) {
        for (const photo of (obs.photos || [])) {
          const baseUrl = photo.url || '';
          rows.push([
            photo.id,
            taxonId,
            obs.id,
            baseUrl,
            baseUrl.replace('square', 'medium'),
            baseUrl.replace('square', 'large'),
            baseUrl.replace('square', 'original'),
            photo.attribution || '',
            photo.license_code || '',
            obs.observed_on || '',
            obs.place_guess || '',
            obs.quality_grade || '',
            obs.user?.login || ''
          ]);
        }
      }

      insertMany(rows);
      totalInserted += rows.length;
      pagesActual = page;

      if (results.length < PER_PAGE) break;
    } catch (err) {
      console.error(`  Photo sync page ${page} error for taxon ${taxonId}: ${err.message}`);
      break;
    }
  }

  let finalCount = db.prepare('SELECT COUNT(*) as count FROM cached_photos WHERE taxon_id = ?').get(taxonId)?.count || 0;

  if (finalCount > MAX_PHOTOS_PER_SPECIES) {
    db.prepare(`
      DELETE FROM cached_photos WHERE taxon_id = ? AND id NOT IN (
        SELECT id FROM cached_photos WHERE taxon_id = ? ORDER BY id DESC LIMIT ?
      )
    `).run(taxonId, taxonId, MAX_PHOTOS_PER_SPECIES);
    finalCount = db.prepare('SELECT COUNT(*) as count FROM cached_photos WHERE taxon_id = ?').get(taxonId)?.count || 0;
  }

  db.prepare(
    'INSERT OR REPLACE INTO photo_sync_status (taxon_id, last_sync, photo_count, pages_fetched) VALUES (?, ?, ?, ?)'
  ).run(taxonId, now, finalCount, pagesActual);

  db.close();
  return { synced: true, count: finalCount, newPhotos: totalInserted, pages: pagesActual };
}

async function bulkSyncAllPhotos(speciesList, progressCallback) {
  ensurePhotoTable();
  let totalPhotos = 0;
  let speciesDone = 0;

  for (const species of speciesList) {
    try {
      const result = await syncPhotosForSpecies(species.taxonId);
      totalPhotos += result.count;
      speciesDone++;
      const label = result.synced
        ? `${result.count} photos (${result.newPhotos} new, ${result.pages} pages)`
        : `cached (${result.count} photos)`;
      console.log(`  📸 ${species.commonName}: ${label}`);
      if (progressCallback) progressCallback(speciesDone, speciesList.length, species.commonName, result);
    } catch (err) {
      console.error(`  ✗ ${species.commonName} photos: ${err.message}`);
      speciesDone++;
    }
  }

  return { totalPhotos, speciesSynced: speciesDone };
}

export {
  ensurePhotoTable,
  syncPhotosForSpecies,
  bulkSyncAllPhotos,
  getCachedPhotos,
  getCachedPhotoCount,
  getAllPhotoStats,
  getPhotoSyncStatus,
  trimPhotos,
  trimAllPhotos
};
