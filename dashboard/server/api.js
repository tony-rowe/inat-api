import {
  getCached, setCache, replaceObservationsForTaxon, updateSyncStatus, getSyncStatus
} from './cache.js';
import { PNW_PLACE_IDS } from './species.js';

const API_BASE = 'https://api.inaturalist.org/v1';
const RATE_LIMIT_MS = 1100;
const CACHE_TTL = 6 * 3600;
const SYNC_COOLDOWN = 3600;
const MAX_PER_PAGE = 200;
const MAX_SPECIES_PAGES = 50000;   // No practical limit; import until complete
const MAX_BATCH_PAGES = 50000;     // No practical limit; batch sync until complete
const LIVE_REPORT_CACHE_TTL = 15 * 60;

let lastRequestTime = 0;

async function rateLimitedFetch(url) {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();

  const res = await fetch(url, {
    headers: { 'User-Agent': 'PNW-Mushroom-Dashboard/1.0 (educational project)' }
  });

  if (!res.ok) {
    throw new Error(`iNaturalist API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function fetchTaxonObservationsPage(taxonId, idBelow = null, perPage = MAX_PER_PAGE) {
  const placeIds = PNW_PLACE_IDS.join(',');
  const query = new URLSearchParams({
    taxon_id: String(taxonId),
    place_id: placeIds,
    per_page: String(perPage),
    order: 'desc',
    order_by: 'id',
    quality_grade: 'research,needs_id'
  });
  if (idBelow) query.set('id_below', String(idBelow));
  const url = `${API_BASE}/observations?${query.toString()}`;
  return rateLimitedFetch(url);
}

/** Minimal request (per_page=1) to get API total_results for a single taxon. Used for alignment verification. */
async function fetchApiTotalForTaxon(taxonId) {
  const placeIds = PNW_PLACE_IDS.join(',');
  const query = new URLSearchParams({
    taxon_id: String(taxonId),
    place_id: placeIds,
    per_page: '1',
    order: 'desc',
    order_by: 'id',
    quality_grade: 'research,needs_id'
  });
  const url = `${API_BASE}/observations?${query.toString()}`;
  const data = await rateLimitedFetch(url);
  return data.total_results ?? 0;
}

async function fetchObservationsBatchPage(taxonIds, idBelow = null, perPage = MAX_PER_PAGE) {
  const placeIds = PNW_PLACE_IDS.join(',');
  const query = new URLSearchParams({
    taxon_id: taxonIds.join(','),
    place_id: placeIds,
    per_page: String(perPage),
    order: 'desc',
    order_by: 'id',
    quality_grade: 'research,needs_id'
  });
  if (idBelow) query.set('id_below', String(idBelow));
  const url = `${API_BASE}/observations?${query.toString()}`;
  return rateLimitedFetch(url);
}

function parseObservation(obs) {
  const photo = obs.photos?.[0];
  const photoUrl = photo
    ? photo.url?.replace('square', 'medium')
    : null;

  return {
    id: obs.id,
    taxon_id: obs.taxon?.id || null,
    species_guess: obs.species_guess || obs.taxon?.name || '',
    quality_grade: obs.quality_grade || 'casual',
    latitude: obs.geojson?.coordinates?.[1] ?? null,
    longitude: obs.geojson?.coordinates?.[0] ?? null,
    observed_on: obs.observed_on || null,
    place_guess: obs.place_guess || '',
    photo_url: photoUrl,
    user_login: obs.user?.login || '',
    created_at: obs.created_at || '',
    updated_at: obs.updated_at || ''
  };
}

async function syncSpecies(taxonId, force = false) {
  const status = getSyncStatus(taxonId);
  const now = Math.floor(Date.now() / 1000);

  if (!force && status && (now - status.last_sync) < SYNC_COOLDOWN) {
    return { synced: false, cached: true, total: status.total_fetched };
  }

  let allObs = [];
  let page = 0;
  let totalResults = 0;
  let idBelow = null;
  let truncated = false;

  try {
    while (page < MAX_SPECIES_PAGES) {
      const data = await fetchTaxonObservationsPage(taxonId, idBelow);
      page += 1;
      if (page === 1) {
        totalResults = data.total_results || 0;
      }

      const results = data.results || [];
      if (results.length === 0) break;

      const parsed = (data.results || []).map(parseObservation).filter(o => o.id);
      allObs.push(...parsed);

      if (results.length < MAX_PER_PAGE || allObs.length >= totalResults) {
        break;
      }

      const minResultId = results.reduce((minId, obs) => {
        if (!obs?.id) return minId;
        return Math.min(minId, obs.id);
      }, Number.POSITIVE_INFINITY);

      if (!Number.isFinite(minResultId)) break;
      idBelow = minResultId;
    }

    if (page >= MAX_SPECIES_PAGES && allObs.length < totalResults) {
      truncated = true;
      console.warn(`Taxon ${taxonId} sync truncated at ${MAX_SPECIES_PAGES} pages (${allObs.length}/${totalResults}).`);
    }

    replaceObservationsForTaxon(taxonId, allObs);
    updateSyncStatus(taxonId, allObs.length, page);

    return { synced: true, cached: false, total: allObs.length, totalAvailable: totalResults, pageCount: page, truncated };
  } catch (err) {
    console.error(`Error syncing taxon ${taxonId}:`, err.message);
    throw err;
  }
}

async function syncSpeciesBatch(taxonIds, force = false) {
  const uniqueTaxonIds = [...new Set((taxonIds || []).map(id => parseInt(id, 10)).filter(Boolean))];
  if (uniqueTaxonIds.length === 0) {
    return {
      synced: false,
      cached: true,
      total: 0,
      totalAvailable: 0,
      pageCount: 0,
      truncated: false,
      perTaxon: []
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const staleTaxa = [];
  const cachedTaxa = [];

  for (const taxonId of uniqueTaxonIds) {
    const status = getSyncStatus(taxonId);
    if (!force && status && (now - status.last_sync) < SYNC_COOLDOWN) {
      cachedTaxa.push({ taxonId, synced: false, cached: true, total: status.total_fetched });
    } else {
      staleTaxa.push(taxonId);
    }
  }

  if (staleTaxa.length === 0) {
    return {
      synced: false,
      cached: true,
      total: 0,
      totalAvailable: 0,
      pageCount: 0,
      truncated: false,
      perTaxon: cachedTaxa
    };
  }

  let allObs = [];
  let page = 0;
  let idBelow = null;
  let totalResults = 0;
  let truncated = false;

  try {
    while (page < MAX_BATCH_PAGES) {
      const data = await fetchObservationsBatchPage(staleTaxa, idBelow);
      page += 1;

      if (page === 1) {
        totalResults = data.total_results || 0;
      }

      const results = data.results || [];
      if (results.length === 0) break;

      const parsed = results.map(parseObservation).filter(o => o.id && staleTaxa.includes(o.taxon_id));
      allObs.push(...parsed);

      const minResultId = results.reduce((minId, obs) => {
        if (!obs?.id) return minId;
        return Math.min(minId, obs.id);
      }, Number.POSITIVE_INFINITY);

      if (!Number.isFinite(minResultId)) break;
      idBelow = minResultId;

      if (results.length < MAX_PER_PAGE) {
        break;
      }
    }

    if (page >= MAX_BATCH_PAGES) {
      truncated = true;
      console.warn(`Batch sync truncated after ${MAX_BATCH_PAGES} pages for ${staleTaxa.length} taxa.`);
    }

    const countsByTaxon = new Map(staleTaxa.map(taxonId => [taxonId, 0]));
    const obsByTaxon = new Map(staleTaxa.map(taxonId => [taxonId, []]));
    for (const obs of allObs) {
      if (obsByTaxon.has(obs.taxon_id)) {
        obsByTaxon.get(obs.taxon_id).push(obs);
        countsByTaxon.set(obs.taxon_id, countsByTaxon.get(obs.taxon_id) + 1);
      }
    }

    const syncedTaxa = staleTaxa.map(taxonId => {
      const total = countsByTaxon.get(taxonId) || 0;
      replaceObservationsForTaxon(taxonId, obsByTaxon.get(taxonId) || []);
      updateSyncStatus(taxonId, total, page);
      return { taxonId, synced: true, cached: false, total };
    });

    return {
      synced: true,
      cached: false,
      total: allObs.length,
      totalAvailable: totalResults,
      pageCount: page,
      truncated,
      perTaxon: [...syncedTaxa, ...cachedTaxa]
    };
  } catch (err) {
    console.error(`Error in batch sync for taxa [${staleTaxa.join(', ')}]:`, err.message);
    throw err;
  }
}

async function fetchTaxonDetails(taxonId) {
  const cacheKey = `taxon_${taxonId}`;
  const cached = getCached(cacheKey, CACHE_TTL);
  if (cached) return cached;

  const data = await rateLimitedFetch(`${API_BASE}/taxa/${taxonId}`);
  const taxon = data.results?.[0];
  if (taxon) {
    const detail = {
      id: taxon.id,
      name: taxon.name,
      commonName: taxon.preferred_common_name || taxon.name,
      rank: taxon.rank,
      ancestorNames: taxon.ancestors?.map(a => a.name) || [],
      observationsCount: taxon.observations_count,
      photoUrl: taxon.default_photo?.medium_url || null,
      squareUrl: taxon.default_photo?.square_url || null,
      wikipediaSummary: taxon.wikipedia_summary || '',
      iconicTaxonName: taxon.iconic_taxon_name || ''
    };
    setCache(cacheKey, detail, CACHE_TTL);
    return detail;
  }
  return null;
}

async function fetchSpeciesCounts() {
  const cacheKey = 'species_counts_pnw';
  const cached = getCached(cacheKey, CACHE_TTL);
  if (cached) return cached;

  const placeIds = PNW_PLACE_IDS.join(',');
  const data = await rateLimitedFetch(
    `${API_BASE}/observations/species_counts?place_id=${placeIds}&iconic_taxa=Fungi&per_page=50&quality_grade=research`
  );

  const result = data.results?.map(r => ({
    taxonId: r.taxon?.id,
    name: r.taxon?.name,
    commonName: r.taxon?.preferred_common_name,
    count: r.count,
    photoUrl: r.taxon?.default_photo?.square_url
  })) || [];

  setCache(cacheKey, result, CACHE_TTL);
  return result;
}

function formatUtcDate(date) {
  return date.toISOString().slice(0, 10);
}

async function fetchLivePnwWeeklyReport() {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - 6);

  const d1 = formatUtcDate(start);
  const d2 = formatUtcDate(end);

  const cacheKey = `live_weekly_pnw_${d1}_${d2}`;
  const cached = getCached(cacheKey, LIVE_REPORT_CACHE_TTL);
  if (cached) {
    return { ...cached, cached: true };
  }

  const placeIds = PNW_PLACE_IDS.join(',');
  const commonParams = new URLSearchParams({
    place_id: placeIds,
    iconic_taxa: 'Plantae,Fungi',
    quality_grade: 'research,needs_id',
    d1,
    d2
  });

  const speciesCountsUrl = `${API_BASE}/observations/species_counts?${new URLSearchParams({
    ...Object.fromEntries(commonParams.entries()),
    per_page: '200'
  }).toString()}`;
  const histogramUrl = `${API_BASE}/observations/histogram?${new URLSearchParams({
    ...Object.fromEntries(commonParams.entries()),
    interval: 'day'
  }).toString()}`;

  const [speciesCountsData, histogramData] = await Promise.all([
    rateLimitedFetch(speciesCountsUrl),
    rateLimitedFetch(histogramUrl)
  ]);

  const topSpecies = (speciesCountsData.results || []).map((r) => ({
    taxonId: r.taxon?.id,
    scientificName: r.taxon?.name || '',
    commonName: r.taxon?.preferred_common_name || r.taxon?.name || '',
    iconicTaxonName: r.taxon?.iconic_taxon_name || '',
    rank: r.taxon?.rank || '',
    count: r.count || 0,
    photoUrl: r.taxon?.default_photo?.square_url || null
  }));

  const dayHistogram = histogramData?.results?.day || {};
  const histogram = Object.entries(dayHistogram)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, count]) => ({ day, count }));

  const totalObservations = histogram.reduce((sum, row) => sum + (row.count || 0), 0);
  const payload = {
    cached: false,
    source: 'inat_api',
    window: { d1, d2, days: 7 },
    queryCount: 2,
    totalObservations,
    histogram,
    topSpecies
  };

  setCache(cacheKey, payload, LIVE_REPORT_CACHE_TTL);
  return payload;
}

export {
  syncSpecies,
  syncSpeciesBatch,
  fetchTaxonDetails,
  fetchSpeciesCounts,
  fetchLivePnwWeeklyReport,
  fetchApiTotalForTaxon,
  rateLimitedFetch
};
