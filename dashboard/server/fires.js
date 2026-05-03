import { getCached, setCache } from './cache.js';

const HISTORICAL_URL = 'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/InterAgencyFirePerimeterHistory_All_Years_View/FeatureServer/0/query';
const CURRENT_URL = 'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters_Current/FeatureServer/0/query';

const OR_BBOX = '-124.8,41.9,-116.3,46.4';
const CACHE_TTL_HISTORICAL = 86400 * 7;
const CACHE_TTL_CURRENT = 3600;
const MIN_ACRES = 100;
const MAX_FEATURES = 500;

async function fetchFirePerimeters(year) {
  const cacheKey = `fires_or_${year}`;
  const cached = getCached(cacheKey, year === 'current' ? CACHE_TTL_CURRENT : CACHE_TTL_HISTORICAL);
  if (cached) return cached;

  let url;
  if (year === 'current') {
    url = `${CURRENT_URL}?where=1=1` +
      `&geometry=${OR_BBOX}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects` +
      `&outFields=poly_IncidentName,poly_GISAcres,irwin_FireDiscoveryDateTime,poly_PercentContained` +
      `&outSR=4326&f=geojson&resultRecordCount=${MAX_FEATURES}`;
  } else {
    url = `${HISTORICAL_URL}?where=FIRE_YEAR_INT=${year}+AND+GIS_ACRES>=${MIN_ACRES}` +
      `&geometry=${OR_BBOX}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects` +
      `&outFields=INCIDENT,GIS_ACRES,FIRE_YEAR_INT,AGENCY` +
      `&outSR=4326&f=geojson&resultRecordCount=${MAX_FEATURES}`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`NIFC API ${res.status}`);
  const geojson = await res.json();

  const simplified = {
    type: 'FeatureCollection',
    features: (geojson.features || []).map(f => {
      const props = f.properties || {};
      const name = props.INCIDENT || props.poly_IncidentName || 'Unknown';
      const acres = props.GIS_ACRES || props.poly_GISAcres || 0;
      const fireYear = props.FIRE_YEAR_INT || year;

      let geom = f.geometry;
      if (geom && geom.type === 'Polygon' && geom.coordinates?.[0]?.length > 500) {
        geom = simplifyPolygon(geom, 0.005);
      } else if (geom && geom.type === 'MultiPolygon') {
        geom = {
          type: 'MultiPolygon',
          coordinates: geom.coordinates.map(poly =>
            poly.map(ring => ring.length > 500 ? simplifyRing(ring, 0.005) : ring)
          )
        };
      }

      return {
        type: 'Feature',
        properties: { name, acres: Math.round(acres), year: fireYear },
        geometry: geom
      };
    }).filter(f => f.geometry)
  };

  setCache(cacheKey, simplified, year === 'current' ? CACHE_TTL_CURRENT : CACHE_TTL_HISTORICAL);
  return simplified;
}

function simplifyPolygon(geom, tolerance) {
  return {
    type: 'Polygon',
    coordinates: geom.coordinates.map(ring => simplifyRing(ring, tolerance))
  };
}

function simplifyRing(ring, tolerance) {
  if (ring.length <= 20) return ring;
  const simplified = [ring[0]];
  for (let i = 1; i < ring.length - 1; i++) {
    const prev = simplified[simplified.length - 1];
    const dx = ring[i][0] - prev[0];
    const dy = ring[i][1] - prev[1];
    if (Math.sqrt(dx * dx + dy * dy) >= tolerance) {
      simplified.push(ring[i]);
    }
  }
  simplified.push(ring[ring.length - 1]);
  return simplified;
}

async function getAvailableYears() {
  const cacheKey = 'fire_years_or_v2';
  const cached = getCached(cacheKey, CACHE_TTL_HISTORICAL);
  if (cached) return cached;

  const currentYear = new Date().getFullYear();
  const candidateYears = [];
  for (let y = currentYear; y >= 2015; y--) candidateYears.push(y);

  const years = [];
  for (const year of candidateYears) {
    try {
      const url = `${HISTORICAL_URL}?where=FIRE_YEAR_INT=${year}+AND+GIS_ACRES>=${MIN_ACRES}` +
        `&geometry=${OR_BBOX}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects` +
        `&returnCountOnly=true&f=json`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.count > 0) years.push({ year, count: data.count });
      }
    } catch {}
  }

  const result = years.map(y => y.year);
  setCache(cacheKey, result, CACHE_TTL_HISTORICAL);
  return result;
}

async function getFireSummary(year) {
  const cacheKey = `fire_summary_or_${year}`;
  const cached = getCached(cacheKey, CACHE_TTL_HISTORICAL);
  if (cached) return cached;

  const url = `${HISTORICAL_URL}?where=FIRE_YEAR_INT=${year}+AND+GIS_ACRES>=${MIN_ACRES}` +
    `&geometry=${OR_BBOX}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects` +
    `&outFields=INCIDENT,GIS_ACRES,AGENCY&orderByFields=GIS_ACRES+DESC` +
    `&f=json&resultRecordCount=${MAX_FEATURES}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`NIFC API ${res.status}`);
  const data = await res.json();

  const fires = (data.features || []).map(f => ({
    name: f.attributes?.INCIDENT || 'Unknown',
    acres: Math.round(f.attributes?.GIS_ACRES || 0),
    agency: f.attributes?.AGENCY || ''
  }));

  const summary = {
    year,
    fireCount: fires.length,
    totalAcres: fires.reduce((sum, f) => sum + f.acres, 0),
    largestFires: fires.slice(0, 20),
    morelPotential: year >= new Date().getFullYear() - 2 ? 'high' : year >= new Date().getFullYear() - 3 ? 'moderate' : 'low'
  };

  setCache(cacheKey, summary, CACHE_TTL_HISTORICAL);
  return summary;
}

export { fetchFirePerimeters, getAvailableYears, getFireSummary };
