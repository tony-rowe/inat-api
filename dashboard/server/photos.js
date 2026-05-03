import { getCached, setCache } from './cache.js';
import { getCachedPhotos, getCachedPhotoCount } from './photo-sync.js';
import { PNW_PLACE_IDS } from './species.js';

const API_BASE = 'https://api.inaturalist.org/v1';
const PHOTO_CACHE_TTL = 86400;
const RATE_LIMIT_MS = 1100;
let lastReq = 0;

async function rateFetch(url) {
  const now = Date.now();
  if (now - lastReq < RATE_LIMIT_MS) await new Promise(r => setTimeout(r, RATE_LIMIT_MS - (now - lastReq)));
  lastReq = Date.now();
  const res = await fetch(url, { headers: { 'User-Agent': 'PNW-Mushroom-Dashboard/1.0' } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function getSpeciesPhotos(taxonId, count = 30) {
  const bulkCount = getCachedPhotoCount(taxonId);
  if (bulkCount >= count) {
    const rows = getCachedPhotos(taxonId, count);
    return rows.map(r => ({
      id: r.id,
      observationId: r.observation_id,
      url: r.url_medium,
      urlLarge: r.url_large,
      urlOriginal: r.url_original,
      attribution: r.attribution,
      license: r.license,
      observedOn: r.observed_on,
      placeGuess: r.place_guess,
      qualityGrade: r.quality_grade,
      userLogin: r.user_login
    }));
  }

  const cacheKey = `photos_${taxonId}_${count}`;
  const cached = getCached(cacheKey, PHOTO_CACHE_TTL);
  if (cached) return cached;

  const placeIds = PNW_PLACE_IDS.join(',');
  const url = `${API_BASE}/observations?taxon_id=${taxonId}&place_id=${placeIds}&photos=true&quality_grade=research&per_page=${Math.min(count, 50)}&order=desc&order_by=votes`;
  const data = await rateFetch(url);

  const photos = [];
  for (const obs of (data.results || [])) {
    for (const photo of (obs.photos || [])) {
      photos.push({
        id: photo.id,
        observationId: obs.id,
        url: photo.url?.replace('square', 'medium'),
        urlLarge: photo.url?.replace('square', 'large'),
        urlOriginal: photo.url?.replace('square', 'original'),
        attribution: photo.attribution || '',
        license: photo.license_code || '',
        observedOn: obs.observed_on,
        placeGuess: obs.place_guess,
        qualityGrade: obs.quality_grade,
        userLogin: obs.user?.login
      });
    }
    if (photos.length >= count) break;
  }

  const result = photos.slice(0, count);
  if (result.length > 0) setCache(cacheKey, result, PHOTO_CACHE_TTL);
  return result;
}

async function getQuizPhotos(taxonIds, photosPerSpecies = 5) {
  const allPhotos = [];
  for (const taxonId of taxonIds) {
    try {
      const photos = await getSpeciesPhotos(taxonId, photosPerSpecies);
      allPhotos.push(...photos.map(p => ({ ...p, taxonId })));
    } catch (err) {
      console.error(`Failed to fetch photos for taxon ${taxonId}:`, err.message);
    }
  }
  return allPhotos;
}

export { getSpeciesPhotos, getQuizPhotos };
