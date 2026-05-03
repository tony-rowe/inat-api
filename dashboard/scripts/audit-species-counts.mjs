import { initDb, getObservationsForTaxon } from '../server/cache.js';
import { rateLimitedFetch } from '../server/api.js';
import { getAllActiveSpecies } from '../server/import.js';

const DEFAULT_TAXA = [350511, 48215];
const PER_PAGE = 200;
const PLACE_OR = 10;
const PLACE_WA = 46;

function parseCliArgs(argv) {
  const args = argv.slice(2);
  const deep = args.includes('--deep');
  const taxonIds = args
    .filter(a => /^\d+$/.test(a))
    .map(a => parseInt(a, 10));
  return {
    deep,
    taxonIds: taxonIds.length > 0 ? taxonIds : DEFAULT_TAXA
  };
}

async function fetchObservationTotal(taxonId, placeId) {
  const query = new URLSearchParams({
    taxon_id: String(taxonId),
    place_id: String(placeId),
    per_page: '1',
    order: 'desc',
    order_by: 'id',
    quality_grade: 'research,needs_id'
  });
  const data = await rateLimitedFetch(`https://api.inaturalist.org/v1/observations?${query.toString()}`);
  return data.total_results || 0;
}

async function fetchObservationIds(taxonId, placeId) {
  let idBelow = null;
  let page = 0;
  let totalResults = 0;
  const ids = new Set();

  while (true) {
    const query = new URLSearchParams({
      taxon_id: String(taxonId),
      place_id: String(placeId),
      per_page: String(PER_PAGE),
      order: 'desc',
      order_by: 'id',
      quality_grade: 'research,needs_id'
    });
    if (idBelow) query.set('id_below', String(idBelow));

    const data = await rateLimitedFetch(`https://api.inaturalist.org/v1/observations?${query.toString()}`);
    page += 1;
    if (page === 1) totalResults = data.total_results || 0;

    const results = data.results || [];
    if (results.length === 0) break;

    for (const obs of results) {
      if (obs?.id) ids.add(obs.id);
    }

    if (results.length < PER_PAGE || ids.size >= totalResults) break;
    const minId = results.reduce((min, obs) => (obs?.id ? Math.min(min, obs.id) : min), Number.POSITIVE_INFINITY);
    if (!Number.isFinite(minId)) break;
    idBelow = minId;
  }

  return { ids, pages: page, totalResults };
}

function formatResult(result) {
  const summary = [
    `Taxon ${result.taxonId} (${result.name})`,
    `  DB total: ${result.dbTotal.toLocaleString()}`,
    `  API OR total: ${result.orTotal.toLocaleString()}`,
    `  API WA total: ${result.waTotal.toLocaleString()}`,
    `  API OR+WA total: ${result.comboTotal.toLocaleString()}`,
    `  OR+WA sum equals OR+WA query: ${result.sumMatchesCombo ? 'yes' : 'no'}`,
    `  DB matches live OR+WA total: ${result.dbMatchesCombo ? 'yes' : 'no'}`
  ];

  if (typeof result.staleInDb === 'number') {
    summary.push(`  Deep check stale IDs in DB: ${result.staleInDb.toLocaleString()}`);
    summary.push(`  Deep check missing IDs in DB: ${result.missingInDb.toLocaleString()}`);
  }
  return summary.join('\n');
}

async function main() {
  const { deep, taxonIds } = parseCliArgs(process.argv);
  const namesByTaxon = new Map(getAllActiveSpecies().map(s => [s.taxonId, s.commonName]));

  await initDb();

  for (const taxonId of taxonIds) {
    const name = namesByTaxon.get(taxonId) || 'Unknown';
    const dbRows = getObservationsForTaxon(taxonId);
    const dbTotal = dbRows.length;

    const [orTotal, waTotal, comboTotal] = await Promise.all([
      fetchObservationTotal(taxonId, PLACE_OR),
      fetchObservationTotal(taxonId, PLACE_WA),
      fetchObservationTotal(taxonId, `${PLACE_OR},${PLACE_WA}`)
    ]);

    const result = {
      taxonId,
      name,
      dbTotal,
      orTotal,
      waTotal,
      comboTotal,
      sumMatchesCombo: (orTotal + waTotal) === comboTotal,
      dbMatchesCombo: dbTotal === comboTotal
    };

    if (deep) {
      const { ids: comboIds } = await fetchObservationIds(taxonId, `${PLACE_OR},${PLACE_WA}`);
      const dbIds = new Set(dbRows.map(r => r.id));
      let staleInDb = 0;
      let missingInDb = 0;

      for (const id of dbIds) {
        if (!comboIds.has(id)) staleInDb += 1;
      }
      for (const id of comboIds) {
        if (!dbIds.has(id)) missingInDb += 1;
      }

      result.staleInDb = staleInDb;
      result.missingInDb = missingInDb;
    }

    console.log(formatResult(result));
    console.log('');
  }
}

main().catch((err) => {
  console.error('Audit failed:', err.message);
  process.exit(1);
});
