import express from 'express';
import cors from 'cors';
import https from 'https';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initDb,
  getObservationStats,
  getGlobalStats,
  getHeatmapData,
  getObservationsForTaxon,
  getAllObservations,
  getRollingObservationReport,
  getRecentWindowSummary,
  getCacheStatus,
  getOutOfRegionSummary,
  pruneOutOfRegionObservations
} from './cache.js';
import { syncSpecies, syncSpeciesBatch, fetchTaxonDetails, fetchLivePnwWeeklyReport, fetchApiTotalForTaxon } from './api.js';
import { PNW_PLACE_IDS } from './species.js';
import { getTopPicks, getSpeciesPredictions, getRegionPredictions, getRegionsGeoJSON, setCalibration, getCalibration } from './predictions.js';
import { runBacktest } from './backtest.js';
import { loadCerts } from './ssl.js';
import { ALL_SPECIES, CATEGORIES } from './all-species.js';
import { getSpeciesPhotos, getQuizPhotos } from './photos.js';
import {
  importByTaxonId,
  getAllActiveSpecies,
  ensureImportTable,
  getImportedSpecies,
  deleteImportedSpecies,
  getBuiltinSpeciesStatus,
  setBuiltinSpeciesHidden
} from './import.js';
import { ensurePhotoTable, bulkSyncAllPhotos, getAllPhotoStats, syncPhotosForSpecies, trimAllPhotos } from './photo-sync.js';
import { fetchFirePerimeters, getAvailableYears, getFireSummary } from './fires.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.API_PORT || 3001;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

const app = express();
app.use(cors());
app.use(express.json());

const syncProgress = new Map();
let lastBacktestResult = null;

app.get('/api/species', (req, res) => {
  const category = req.query.category;
  let species = getAllActiveSpecies();
  if (category && category !== 'all') species = species.filter(s => s.category === category);
  res.json({ species, categories: CATEGORIES, placeIds: PNW_PLACE_IDS });
});

app.get('/api/species/builtins', (_req, res) => {
  try {
    const species = getBuiltinSpeciesStatus();
    res.json({ species, total: species.length, hidden: species.filter(s => s.hidden).length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/species/builtins/:id/hide', (req, res) => {
  try {
    const updated = setBuiltinSpeciesHidden(req.params.id, true);
    res.json({ status: 'ok', ...updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/species/builtins/:id/show', (req, res) => {
  try {
    const updated = setBuiltinSpeciesHidden(req.params.id, false);
    res.json({ status: 'ok', ...updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/species/:id', async (req, res) => {
  try {
    const species = getAllActiveSpecies().find(s => s.id === req.params.id);
    if (!species) return res.status(404).json({ error: 'Species not found' });

    const [taxonDetails, stats] = await Promise.all([
      fetchTaxonDetails(species.taxonId).catch(() => null),
      Promise.resolve(getObservationStats(species.taxonId))
    ]);

    res.json({ species, taxonDetails, stats });
  } catch (err) {
    console.error('Error fetching species detail:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sync/:taxonId', async (req, res) => {
  const taxonId = parseInt(req.params.taxonId);
  const force = req.query.force === 'true';

  if (syncProgress.get(taxonId)) {
    return res.json({ status: 'already_syncing' });
  }

  syncProgress.set(taxonId, true);
  try {
    const result = await syncSpecies(taxonId, force);
    res.json({ status: 'ok', ...result });
  } catch (err) {
    console.error(`Sync error for taxon ${taxonId}:`, err);
    res.status(500).json({ error: err.message });
  } finally {
    syncProgress.delete(taxonId);
  }
});

app.post('/api/sync-all', async (_req, res) => {
  const allSpecies = getAllActiveSpecies();
  res.json({ status: 'started', total: allSpecies.length });

  (async () => {
    for (const species of allSpecies) {
      if (!syncProgress.get(species.taxonId)) {
        syncProgress.set(species.taxonId, true);
        try {
          const result = await syncSpecies(species.taxonId, true);
          const statusLabel = result.cached ? 'cached' : 'synced';
          const truncatedLabel = result.truncated ? ' (partial)' : '';
          console.log(`${statusLabel.toUpperCase()}: ${species.commonName} (${species.taxonId}) - ${result.total} observations${truncatedLabel}`);
        } catch (err) {
          console.error(`Failed to sync ${species.commonName}:`, err.message);
        } finally {
          syncProgress.delete(species.taxonId);
        }
      }
    }
    console.log('Background sync complete for all species.');
  })();
});

app.get('/api/sync-progress', (_req, res) => {
  const syncing = Array.from(syncProgress.keys());
  res.json({ syncing, count: syncing.length });
});

app.get('/api/stats', (_req, res) => {
  try {
    const stats = getGlobalStats();
    const allSpecies = getAllActiveSpecies();
    const speciesStats = allSpecies.map(s => {
      const sStats = getObservationStats(s.taxonId);
      return { id: s.id, taxonId: s.taxonId, commonName: s.commonName, category: s.category, emoji: s.emoji, ...sStats };
    });
    res.json({ global: stats, species: speciesStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/heatmap', (req, res) => {
  try {
    const taxonId = req.query.taxon_id ? parseInt(req.query.taxon_id) : null;
    const onlyPnw = req.query.only_pnw !== 'false';
    const points = getHeatmapData(taxonId, onlyPnw);
    res.json({ points, count: points.length, onlyPnw });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/predictions', (req, res) => {
  try {
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const limit = parseInt(req.query.limit) || 15;
    const category = req.query.category;
    const topPicks = getTopPicks(month, limit, category);
    res.json({ month, calibrated: !!getCalibration(), topPicks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/predictions/species/:id', (req, res) => {
  try {
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const predictions = getSpeciesPredictions(req.params.id, month);
    res.json({ month, speciesId: req.params.id, calibrated: !!getCalibration(), predictions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/predictions/region/:id', (req, res) => {
  try {
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const predictions = getRegionPredictions(req.params.id, month);
    res.json({ month, regionId: req.params.id, calibrated: !!getCalibration(), predictions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/regions/geojson', (_req, res) => {
  try {
    res.json(getRegionsGeoJSON());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/observations', (req, res) => {
  try {
    const taxonId = req.query.taxon_id ? parseInt(req.query.taxon_id) : null;
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    let obs;
    if (taxonId) {
      obs = getObservationsForTaxon(taxonId);
    } else {
      obs = getAllObservations();
    }
    res.json({ observations: obs.slice(0, limit), total: obs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cache/status', (_req, res) => {
  try {
    res.json(getCacheStatus());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cache/out-of-region', (_req, res) => {
  try {
    res.json(getOutOfRegionSummary());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cache/prune-out-of-region', (_req, res) => {
  try {
    const result = pruneOutOfRegionObservations();
    res.json({ status: 'ok', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/summary', (req, res) => {
  try {
    const days = Math.max(parseInt(req.query.days) || 35, 7);
    const window = Math.max(parseInt(req.query.window) || 7, 2);
    const taxonId = req.query.taxon_id ? parseInt(req.query.taxon_id) : null;

    const rolling = getRollingObservationReport(days, window, taxonId);
    const recent7d = getRecentWindowSummary(7, taxonId);
    const previous7d = getRecentWindowSummary(14, taxonId);
    const previousWeekOnly = Math.max(previous7d.total - recent7d.total, 0);

    const speciesByTaxon = new Map(getAllActiveSpecies().map(s => [s.taxonId, s.commonName]));
    const topSpecies = recent7d.topTaxa.map(item => ({
      taxonId: item.taxon_id,
      count: item.count,
      commonName: speciesByTaxon.get(item.taxon_id) || `Taxon ${item.taxon_id}`
    }));

    res.json({
      rolling,
      recent7d: {
        ...recent7d,
        previousWeekTotal: previousWeekOnly,
        deltaVsPreviousWeek: recent7d.total - previousWeekOnly,
        topSpecies
      },
      cache: getCacheStatus()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/live-weekly', async (_req, res) => {
  try {
    const live = await fetchLivePnwWeeklyReport();
    res.json(live);
  } catch (err) {
    console.error('Live weekly report error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/api-alignment', async (_req, res) => {
  try {
    const species = getAllActiveSpecies();
    const results = [];
    for (const s of species) {
      const ourStats = getObservationStats(s.taxonId);
      const ourCount = ourStats?.total ?? 0;
      let apiTotal = null;
      let error = null;
      try {
        apiTotal = await fetchApiTotalForTaxon(s.taxonId);
      } catch (e) {
        error = e.message || 'API error';
      }
      const diff = apiTotal != null ? ourCount - apiTotal : null;
      results.push({
        taxonId: s.taxonId,
        commonName: s.commonName || s.scientificName,
        ourCount,
        apiTotal,
        error,
        aligned: error ? null : ourCount === apiTotal,
        difference: diff
      });
    }
    res.json({ taxa: results });
  } catch (err) {
    console.error('API alignment error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/backtest', (_req, res) => {
  try {
    const result = runBacktest();
    setCalibration(result);
    lastBacktestResult = result;
    res.json({ status: 'ok', calibration: result });
  } catch (err) {
    console.error('Backtest error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/backtest', (_req, res) => {
  res.json({ calibration: lastBacktestResult, calibrated: !!getCalibration() });
});

app.post('/api/import', async (req, res) => {
  try {
    const { taxonId } = req.body;
    if (!taxonId || isNaN(parseInt(taxonId))) {
      return res.status(400).json({ error: 'Valid taxonId required' });
    }
    const result = await importByTaxonId(parseInt(taxonId));
    res.json(result);
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/imported', (_req, res) => {
  const imported = getImportedSpecies();
  res.json({ species: imported, count: imported.length });
});

app.delete('/api/imported/:id', (req, res) => {
  try {
    deleteImportedSpecies(req.params.id);
    res.json({ status: 'deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/field-guide', (req, res) => {
  const category = req.query.category;
  let species = getAllActiveSpecies();
  if (category && category !== 'all') {
    species = species.filter(s => s.category === category);
  }
  res.json({ species, categories: CATEGORIES, total: species.length });
});

app.get('/api/field-guide/:id', (req, res) => {
  const species = getAllActiveSpecies().find(s => s.id === req.params.id);
  if (!species) return res.status(404).json({ error: 'Species not found' });
  res.json(species);
});

app.get('/api/fires/years', async (_req, res) => {
  try {
    const years = await getAvailableYears();
    res.json({ years });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/fires/:year', async (req, res) => {
  try {
    const year = req.params.year === 'current' ? 'current' : parseInt(req.params.year);
    const geojson = await fetchFirePerimeters(year);
    res.json(geojson);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/fires/:year/summary', async (req, res) => {
  try {
    const summary = await getFireSummary(parseInt(req.params.year));
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/photos/stats', (_req, res) => {
  try {
    const stats = getAllPhotoStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/photos/sync-all', async (_req, res) => {
  res.json({ status: 'started', message: 'Bulk photo sync started in background' });
  const allSpecies = getAllActiveSpecies();
  bulkSyncAllPhotos(allSpecies).then(result => {
    console.log(`Bulk photo sync complete: ${result.totalPhotos} total photos across ${result.speciesSynced} species`);
  }).catch(err => console.error('Bulk photo sync error:', err));
});

app.post('/api/photos/sync/:taxonId', async (req, res) => {
  try {
    const result = await syncPhotosForSpecies(parseInt(req.params.taxonId));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/photos/:taxonId', async (req, res) => {
  try {
    const taxonId = parseInt(req.params.taxonId);
    const count = Math.min(parseInt(req.query.count) || 20, 50);
    const photos = await getSpeciesPhotos(taxonId, count);
    res.json({ taxonId, photos, count: photos.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/quiz', async (req, res) => {
  try {
    const category = req.query.category || 'all';
    const count = Math.min(parseInt(req.query.count) || 10, 30);
    let pool = ALL_SPECIES.filter(s => s.taxonId);
    if (category !== 'all') pool = pool.filter(s => s.category === category);

    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
    const taxonIds = shuffled.map(s => s.taxonId);
    const photos = await getQuizPhotos(taxonIds, 3);

    const questions = [];
    for (const species of shuffled) {
      const speciesPhotos = photos.filter(p => p.taxonId === species.taxonId);
      if (speciesPhotos.length === 0) continue;
      const photo = speciesPhotos[Math.floor(Math.random() * speciesPhotos.length)];

      const wrongPool = pool.filter(s => s.id !== species.id && s.category === species.category);
      const wrongs = [...wrongPool].sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [species, ...wrongs].sort(() => Math.random() - 0.5);

      questions.push({
        photo: { url: photo.url, urlLarge: photo.urlLarge, attribution: photo.attribution, placeGuess: photo.placeGuess, observedOn: photo.observedOn },
        correctId: species.id,
        correctName: species.commonName,
        category: species.category,
        options: options.map(o => ({ id: o.id, commonName: o.commonName, scientificName: o.scientificName, emoji: o.emoji })),
        hint: species.idTips,
        lookalikes: species.lookalikes || []
      });
    }

    res.json({ questions, category, total: questions.length });
  } catch (err) {
    console.error('Quiz error:', err);
    res.status(500).json({ error: err.message });
  }
});

async function start() {
  await initDb();
  console.log('Database initialized.');

  app.listen(PORT, () => {
    console.log(`HTTP API server running on http://localhost:${PORT}`);
  });

  const certs = loadCerts();
  if (certs) {
    try {
      https.createServer({ key: certs.key, cert: certs.cert }, app).listen(HTTPS_PORT, () => {
        console.log(`HTTPS API server running on https://localhost:${HTTPS_PORT} (${certs.source})`);
      });
    } catch (err) {
      console.error('Failed to start HTTPS server:', err.message);
    }
  }

  ensureImportTable();
  ensurePhotoTable();

  const allSpecies = getAllActiveSpecies();
  const taxonIds = allSpecies.map((s) => s.taxonId);
  console.log(`Starting batch sync of ${taxonIds.length} species (single chained query)...`);
  try {
    const result = await syncSpeciesBatch(taxonIds);
    if (result.synced) {
      const truncatedLabel = result.truncated ? ' (partial)' : '';
      console.log(`  ✓ Batch sync: ${result.total} observations across ${result.perTaxon?.length || 0} species${truncatedLabel}`);
      for (const p of result.perTaxon || []) {
        const species = allSpecies.find((s) => s.taxonId === p.taxonId);
        const name = species?.commonName || `taxon ${p.taxonId}`;
        console.log(`    - ${name}: ${p.total} obs`);
      }
    } else {
      console.log(`  ✓ Batch sync: cached (${result.perTaxon?.length || 0} species)`);
    }
  } catch (err) {
    console.error(`  ✗ Batch sync failed: ${err.message}. Falling back to per-species sync...`);
    for (const species of allSpecies) {
      syncProgress.set(species.taxonId, true);
      try {
        const result = await syncSpecies(species.taxonId);
        if (result.synced) {
          const truncatedLabel = result.truncated ? ' (partial)' : '';
          console.log(`  ✓ ${species.commonName}: ${result.total} observations${truncatedLabel}`);
        } else {
          console.log(`  ✓ ${species.commonName}: cached (${result.total} obs)`);
        }
      } catch (e) {
        console.error(`  ✗ ${species.commonName}: ${e.message}`);
      } finally {
        syncProgress.delete(species.taxonId);
      }
    }
  }
  console.log('Initial sync complete.');

  console.log('\nTrimming photos to 50 per species...');
  const afterTrim = trimAllPhotos(allSpecies);
  console.log(`  Photos after trim: ${afterTrim.toLocaleString()}`);

  console.log('\nStarting bulk photo sync (background, max 50/species)...');
  bulkSyncAllPhotos(allSpecies).then(result => {
    console.log(`\n📸 Photo sync complete: ${result.totalPhotos.toLocaleString()} total photos across ${result.speciesSynced} species\n`);
  }).catch(err => console.error('Photo sync error:', err));

  console.log('\nRunning prediction backtest and calibration...');
  try {
    lastBacktestResult = runBacktest();
    setCalibration(lastBacktestResult);
    console.log('Prediction engine calibrated from observation data.\n');
  } catch (err) {
    console.error('Backtest failed (using default weights):', err.message);
  }

  const BACKGROUND_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;
  setInterval(async () => {
    const species = getAllActiveSpecies();
    const ids = species.map((s) => s.taxonId);
    if (ids.length === 0) return;
    try {
      const result = await syncSpeciesBatch(ids, true);
      if (result.synced) {
        console.log(`[Background] Cache updated: ${result.total} observations`);
      }
    } catch (err) {
      console.error('[Background] Sync error:', err.message);
    }
  }, BACKGROUND_SYNC_INTERVAL_MS);
  console.log('Background cache sync scheduled every 6 hours.');
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
