import { getCached, setCache, initDb } from './cache.js';
import { syncSpecies, fetchTaxonDetails, rateLimitedFetch } from './api.js';
import { ALL_SPECIES, CATEGORIES } from './all-species.js';
import { SPECIES_ECOLOGY } from './regions.js';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'cache.db');

function getDb() {
  return new Database(DB_PATH);
}

function ensureImportTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS imported_species (
      id TEXT PRIMARY KEY,
      taxon_id INTEGER UNIQUE NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS builtin_species_visibility (
      id TEXT PRIMARY KEY,
      taxon_id INTEGER UNIQUE NOT NULL,
      hidden INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `);
  db.close();
}

function guessCategory(taxon) {
  const iconic = (taxon.iconicTaxonName || '').toLowerCase();
  const ancestors = (taxon.ancestorNames || []).map(a => a.toLowerCase());
  const name = (taxon.name || '').toLowerCase();

  if (iconic === 'fungi' || ancestors.includes('fungi')) return 'fungi';
  if (iconic === 'actinopterygii' || iconic === 'ray-finned fishes' || ancestors.some(a => a.includes('salmonid') || a.includes('fish'))) return 'fish';
  if (ancestors.some(a => a.includes('malacostraca') || a.includes('bivalvia') || a.includes('gastropoda'))) return 'marine';
  if (ancestors.some(a => a.includes('rhodophyta') || a.includes('phaeophyceae') || a.includes('ulvophyceae') || a.includes('chlorophyta'))) return 'seaweed';

  if (iconic === 'plantae' || ancestors.includes('plantae')) {
    if (ancestors.some(a => a.includes('rubus') || a.includes('vaccinium') || a.includes('ribes') || a.includes('sambucus') || a.includes('gaultheria'))) return 'berry';
    if (ancestors.some(a => a.includes('rosaceae') && !a.includes('rubus'))) return 'flower';
    if (ancestors.some(a => a.includes('fagales') || a.includes('juglandales') || a.includes('corylus'))) return 'nut';
    return 'plant';
  }

  return 'plant';
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function guessSeason(taxon, category) {
  const defaults = {
    fungi: { start: 9, end: 12, peak: [10, 11] },
    berry: { start: 6, end: 9, peak: [7, 8] },
    plant: { start: 3, end: 10, peak: [5, 6] },
    flower: { start: 5, end: 9, peak: [6, 7] },
    seaweed: { start: 4, end: 10, peak: [7, 8] },
    marine: { start: 12, end: 8, peak: [12, 1, 2] },
    fish: { start: 3, end: 11, peak: [5, 6, 9] },
    nut: { start: 8, end: 10, peak: [9] }
  };
  return defaults[category] || defaults.plant;
}

function guessEcology(taxon, category) {
  const cat = category;
  const base = {
    preferredForests: cat === 'fungi' ? ['douglas_fir', 'western_hemlock']
      : cat === 'berry' ? ['douglas_fir', 'western_hemlock', 'bigleaf_maple']
      : cat === 'seaweed' || cat === 'marine' ? []
      : cat === 'fish' ? []
      : ['douglas_fir', 'bigleaf_maple', 'red_alder'],
    elevationRange: cat === 'seaweed' || cat === 'marine' || cat === 'fish'
      ? { min: 0, max: 0 }
      : { min: 0, max: 1200 },
    optimalPrecipMonth: cat === 'fungi' ? 120 : cat === 'seaweed' || cat === 'marine' ? 0 : 50,
    tempRange: { min: 5, max: 22, optimal: 14 },
    soilPreference: cat === 'fungi' ? ['loam', 'organic']
      : cat === 'seaweed' ? ['rocky_coast']
      : cat === 'marine' ? ['bay', 'ocean']
      : cat === 'fish' ? ['river', 'stream']
      : ['loam', 'well_drained'],
    tips: `Imported from iNaturalist (taxon ${taxon.id}). Verify habitat and season data.`,
    accessTip: 'Check iNaturalist observations for specific locations.'
  };
  return base;
}

function categoryEmoji(cat) {
  const map = { fungi: '🍄', berry: '🫐', plant: '🌿', flower: '🌸', marine: '🦀', fish: '🐟', nut: '🌰', seaweed: '🌊' };
  return map[cat] || '🔍';
}

async function importByTaxonId(taxonId) {
  const existing = ALL_SPECIES.find(s => s.taxonId === taxonId);
  if (existing) {
    return { status: 'exists', species: existing, message: `${existing.commonName} already in system` };
  }

  const db = getDb();
  const existingImported = db.prepare('SELECT data FROM imported_species WHERE taxon_id = ?').get(taxonId);
  db.close();
  if (existingImported) {
    const parsed = JSON.parse(existingImported.data);
    return { status: 'exists', species: parsed, message: `${parsed.commonName} already imported` };
  }

  console.log(`Importing taxon ${taxonId}...`);
  const taxon = await fetchTaxonDetails(taxonId);
  if (!taxon) throw new Error(`Taxon ${taxonId} not found on iNaturalist`);

  const category = guessCategory(taxon);
  const id = slugify(taxon.commonName || taxon.name);
  const season = guessSeason(taxon, category);

  const species = {
    id,
    taxonId,
    category,
    scientificName: taxon.name,
    commonName: taxon.commonName || taxon.name,
    description: taxon.wikipediaSummary
      ? taxon.wikipediaSummary.replace(/<[^>]*>/g, '').substring(0, 300)
      : `${taxon.commonName || taxon.name} — imported from iNaturalist.`,
    season,
    emoji: categoryEmoji(category),
    color: CATEGORIES[category]?.color || '#6B7280',
    habitat: `See iNaturalist for habitat details`,
    edibility: 'Verify edibility independently',
    idTips: 'Auto-imported — add identification tips after review.',
    lookalikes: [],
    foragerScore: { identification: 3, abundance: 3, culinaryValue: 3, safetyRisk: 3, seasonLength: 3, preservation: 3 },
    imported: true,
    photoUrl: taxon.photoUrl,
    iNatObservations: taxon.observationsCount
  };

  species.foragerScore.overall = Math.round(
    (species.foragerScore.identification * 0.20 +
     species.foragerScore.abundance * 0.15 +
     species.foragerScore.culinaryValue * 0.25 +
     (6 - species.foragerScore.safetyRisk) * 0.20 +
     species.foragerScore.seasonLength * 0.10 +
     species.foragerScore.preservation * 0.10) * 20
  );

  const db2 = getDb();
  db2.prepare(
    'INSERT OR REPLACE INTO imported_species (id, taxon_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, taxonId, JSON.stringify(species), new Date().toISOString(), new Date().toISOString());
  db2.close();

  console.log(`  Syncing observations for ${species.commonName}...`);
  const syncResult = await syncSpecies(taxonId, true);
  console.log(`  ✓ ${species.commonName}: ${syncResult.total} observations synced`);

  return {
    status: 'imported',
    species,
    syncResult,
    ecology: guessEcology(taxon, category),
    message: `Imported ${species.commonName} (${category}) with ${syncResult.total} observations`
  };
}

function getImportedSpecies() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT data FROM imported_species').all();
    db.close();
    return rows.map(r => JSON.parse(r.data));
  } catch {
    return [];
  }
}

function getHiddenBuiltinSpeciesIds() {
  try {
    const db = getDb();
    const rows = db.prepare(
      'SELECT id FROM builtin_species_visibility WHERE hidden = 1'
    ).all();
    db.close();
    return new Set(rows.map(r => r.id));
  } catch {
    return new Set();
  }
}

function getBuiltinSpeciesStatus() {
  const hidden = getHiddenBuiltinSpeciesIds();
  return ALL_SPECIES.map(species => ({
    id: species.id,
    taxonId: species.taxonId,
    category: species.category,
    commonName: species.commonName,
    scientificName: species.scientificName,
    hidden: hidden.has(species.id)
  }));
}

function setBuiltinSpeciesHidden(id, hidden) {
  const species = ALL_SPECIES.find(s => s.id === id);
  if (!species) {
    throw new Error(`Built-in species not found: ${id}`);
  }

  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO builtin_species_visibility (id, taxon_id, hidden, updated_at)
     VALUES (?, ?, ?, ?)`
  ).run(species.id, species.taxonId, hidden ? 1 : 0, new Date().toISOString());
  db.close();

  return {
    id: species.id,
    taxonId: species.taxonId,
    hidden: !!hidden
  };
}

function deleteImportedSpecies(id) {
  const db = getDb();
  db.prepare('DELETE FROM imported_species WHERE id = ?').run(id);
  db.close();
}

function getAllActiveSpecies() {
  const hiddenBuiltinIds = getHiddenBuiltinSpeciesIds();
  const imported = getImportedSpecies();
  const existingIds = new Set(ALL_SPECIES.map(s => s.taxonId));
  const newImports = imported.filter(s => !existingIds.has(s.taxonId));
  const activeBuiltins = ALL_SPECIES
    .filter(s => !hiddenBuiltinIds.has(s.id))
    .map(s => ({ ...s, builtin: true, imported: false }));
  const activeImports = newImports.map(s => ({ ...s, builtin: false, imported: true }));
  return [...activeBuiltins, ...activeImports];
}

function getActiveSpeciesForPredictions() {
  return getAllActiveSpecies().filter(s => s.season);
}

function getEcologyForSpecies(speciesId) {
  if (SPECIES_ECOLOGY[speciesId]) return SPECIES_ECOLOGY[speciesId];
  const species = getAllActiveSpecies().find(s => s.id === speciesId);
  if (!species) return null;
  return guessEcology({ id: species.taxonId, commonName: species.commonName }, species.category);
}

export {
  importByTaxonId,
  getImportedSpecies,
  deleteImportedSpecies,
  getBuiltinSpeciesStatus,
  setBuiltinSpeciesHidden,
  getAllActiveSpecies,
  getActiveSpeciesForPredictions,
  getEcologyForSpecies,
  ensureImportTable
};
