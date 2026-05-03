import { OREGON_REGIONS, SPECIES_ECOLOGY } from './regions.js';
import { getAllObservations } from './cache.js';
import { getActiveSpeciesForPredictions, getEcologyForSpecies } from './import.js';

function pointInPolygon(lat, lon, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = [polygon[i][1], polygon[i][0]];
    const [xj, yj] = [polygon[j][1], polygon[j][0]];
    if ((yi > lon) !== (yj > lon) && lat < ((xj - xi) * (lon - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function assignRegion(lat, lon) {
  for (const region of OREGON_REGIONS) {
    if (pointInPolygon(lat, lon, region.polygon)) return region.id;
  }
  return null;
}

function buildActualDensityMatrix() {
  const observations = getAllObservations();
  const matrix = {};
  let assigned = 0;
  let unassigned = 0;

  for (const obs of observations) {
    if (!obs.latitude || !obs.longitude || !obs.observed_on) continue;
    const month = new Date(obs.observed_on).getMonth() + 1;
    if (month < 1 || month > 12) continue;

    const regionId = assignRegion(obs.latitude, obs.longitude);
    if (!regionId) { unassigned++; continue; }
    assigned++;

    const key = `${obs.taxon_id}|${regionId}|${month}`;
    matrix[key] = (matrix[key] || 0) + 1;
  }

  return { matrix, assigned, unassigned, total: observations.length };
}

function rawScore(species, region, month) {
  const ecology = getEcologyForSpecies(species.id) || {};
  const season = species.season || {};

  const isPeak = season.peak?.includes(month);
  const inSeason = (() => {
    if (!season.start) return false;
    if (season.start <= season.end) return month >= season.start && month <= season.end;
    return month >= season.start || month <= season.end;
  })();
  const adjacent = (() => {
    if (!season.start) return false;
    const before = season.start === 1 ? 12 : season.start - 1;
    const after = season.end === 12 ? 1 : season.end + 1;
    return month === before || month === after;
  })();
  const seasonRaw = isPeak ? 1.0 : inSeason ? 0.7 : adjacent ? 0.3 : 0.0;

  const regionForests = new Set(region.forestTypes || []);
  const preferred = ecology.preferredForests || [];
  let habitatRaw = 0.4;
  if (preferred.length > 0) {
    const matches = preferred.filter(f => regionForests.has(f));
    habitatRaw = matches.length / preferred.length;
  }

  const elevRange = ecology.elevationRange || { min: 0, max: 3000 };
  const speciesElevSpan = elevRange.max - elevRange.min;
  const overlapMin = Math.max(elevRange.min, region.elevation?.min || 0);
  const overlapMax = Math.min(elevRange.max, region.elevation?.max || 3000);
  const elevRaw = speciesElevSpan > 0 && overlapMin <= overlapMax
    ? Math.min(1, (overlapMax - overlapMin) / speciesElevSpan)
    : overlapMin <= overlapMax ? 0.5 : 0;

  const monthPrecip = region.monthlyPrecip?.[month - 1] || 0;
  const prevPrecip = region.monthlyPrecip?.[(month - 2 + 12) % 12] || 0;
  const effective = monthPrecip * 0.4 + prevPrecip * 0.6;
  const optPrecip = ecology.optimalPrecipMonth || 100;
  const precipRatio = effective / optPrecip;
  const precipRaw = precipRatio >= 0.7 && precipRatio <= 2.0 ? 1.0
    : precipRatio >= 0.4 ? 0.6 : precipRatio > 2.0 ? 0.7 : 0.2;

  const temp = region.monthlyTemp?.[month - 1] ?? 10;
  const tr = ecology.tempRange || { min: 0, max: 30, optimal: 12 };
  let tempRaw = 0;
  if (temp >= tr.min && temp <= tr.max) {
    const dist = Math.abs(temp - tr.optimal);
    tempRaw = 1 - (dist / (tr.max - tr.min));
  } else {
    const outside = temp < tr.min ? tr.min - temp : temp - tr.max;
    tempRaw = outside <= 3 ? 0.3 : 0;
  }

  return { seasonRaw, habitatRaw, elevRaw, precipRaw, tempRaw };
}

function pearsonCorrelation(x, y) {
  const n = x.length;
  if (n < 3) return 0;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

function olsRegression(X, y) {
  const n = X.length;
  const k = X[0].length;

  const XtX = Array.from({ length: k }, () => Array(k).fill(0));
  const Xty = Array(k).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < k; j++) {
      Xty[j] += X[i][j] * y[i];
      for (let l = 0; l < k; l++) {
        XtX[j][l] += X[i][j] * X[i][l];
      }
    }
  }

  for (let j = 0; j < k; j++) XtX[j][j] += 0.01;

  const beta = solveLinearSystem(XtX, Xty);
  return beta.map(b => Math.max(0, b));
}

function solveLinearSystem(A, b) {
  const n = A.length;
  const aug = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    if (Math.abs(aug[col][col]) < 1e-10) continue;

    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) aug[row][j] -= factor * aug[col][j];
    }
  }

  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    if (Math.abs(aug[i][i]) < 1e-10) continue;
    x[i] = aug[i][n];
    for (let j = i + 1; j < n; j++) x[i] -= aug[i][j] * x[j];
    x[i] /= aug[i][i];
  }
  return x;
}

function runBacktest() {
  console.log('Starting backtest...');
  const { matrix, assigned, unassigned, total } = buildActualDensityMatrix();
  console.log(`  Observations: ${total} total, ${assigned} assigned to regions, ${unassigned} unassigned`);

  const activeSpecies = getActiveSpeciesForPredictions();
  console.log(`  Species in backtest: ${activeSpecies.length}`);

  const dataPoints = [];

  for (const species of activeSpecies) {
    for (const region of OREGON_REGIONS) {
      for (let month = 1; month <= 12; month++) {
        const key = `${species.taxonId}|${region.id}|${month}`;
        const actual = matrix[key] || 0;
        const scores = rawScore(species, region, month);

        dataPoints.push({
          speciesId: species.id,
          taxonId: species.taxonId,
          regionId: region.id,
          month,
          actual,
          ...scores
        });
      }
    }
  }

  const actuals = dataPoints.map(d => d.actual);
  const maxActual = Math.max(...actuals, 1);
  const normalizedActuals = actuals.map(a => Math.log1p(a) / Math.log1p(maxActual));

  const X = dataPoints.map(d => [d.seasonRaw, d.habitatRaw, d.elevRaw, d.precipRaw, d.tempRaw]);
  const y = normalizedActuals;

  const factorNames = ['season', 'habitat', 'elevation', 'precipitation', 'temperature'];
  const correlations = {};
  for (let f = 0; f < 5; f++) {
    const col = X.map(row => row[f]);
    const corr = pearsonCorrelation(col, y);
    correlations[factorNames[f]] = isFinite(corr) ? corr : 0;
  }

  console.log('  Per-factor correlations with actual observation density:');
  for (const [name, corr] of Object.entries(correlations)) {
    console.log(`    ${name}: ${corr.toFixed(4)}`);
  }

  const weights = olsRegression(X, y);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const normalizedWeights = totalWeight > 0
    ? weights.map(w => w / totalWeight)
    : [0.36, 0.23, 0.14, 0.09, 0.09];

  const ORIGINAL_MAX = [40, 25, 15, 10, 10];
  const TOTAL_MAX = 100;
  const calibratedMax = normalizedWeights.map(w => Math.round(w * TOTAL_MAX));
  const remainder = TOTAL_MAX - calibratedMax.reduce((a, b) => a + b, 0);
  if (remainder !== 0) {
    const maxIdx = calibratedMax.indexOf(Math.max(...calibratedMax));
    calibratedMax[maxIdx] += remainder;
  }

  const predictedBefore = dataPoints.map(d =>
    d.seasonRaw * ORIGINAL_MAX[0] + d.habitatRaw * ORIGINAL_MAX[1] +
    d.elevRaw * ORIGINAL_MAX[2] + d.precipRaw * ORIGINAL_MAX[3] + d.tempRaw * ORIGINAL_MAX[4]
  );
  const predictedAfter = dataPoints.map(d =>
    d.seasonRaw * calibratedMax[0] + d.habitatRaw * calibratedMax[1] +
    d.elevRaw * calibratedMax[2] + d.precipRaw * calibratedMax[3] + d.tempRaw * calibratedMax[4]
  );

  const corrBefore = pearsonCorrelation(predictedBefore, y);
  const corrAfter = pearsonCorrelation(predictedAfter, y);

  const perSpecies = {};
  for (const species of activeSpecies) {
    const speciesPoints = dataPoints
      .map((d, i) => ({ ...d, normActual: y[i], predBefore: predictedBefore[i], predAfter: predictedAfter[i] }))
      .filter(d => d.speciesId === species.id);

    const spActuals = speciesPoints.map(d => d.normActual);
    const spBefore = speciesPoints.map(d => d.predBefore);
    const spAfter = speciesPoints.map(d => d.predAfter);

    const totalObs = speciesPoints.reduce((a, d) => a + d.actual, 0);
    const topPredRegions = speciesPoints
      .filter(d => d.predAfter > 0)
      .sort((a, b) => b.predAfter - a.predAfter)
      .slice(0, 5);
    const topActualRegions = speciesPoints
      .filter(d => d.actual > 0)
      .sort((a, b) => b.actual - a.actual)
      .slice(0, 5);

    perSpecies[species.id] = {
      commonName: species.commonName,
      totalObservations: totalObs,
      correlationBefore: pearsonCorrelation(spBefore, spActuals),
      correlationAfter: pearsonCorrelation(spAfter, spActuals),
      topPredicted: topPredRegions.map(d => ({ region: d.regionId, month: d.month, score: Math.round(d.predAfter) })),
      topActual: topActualRegions.map(d => ({ region: d.regionId, month: d.month, count: d.actual }))
    };
  }

  const calibration = {
    timestamp: new Date().toISOString(),
    dataPoints: dataPoints.length,
    observationsUsed: assigned,
    factorWeights: {
      season: { max: calibratedMax[0], correlation: correlations.season, originalMax: ORIGINAL_MAX[0] },
      habitat: { max: calibratedMax[1], correlation: correlations.habitat, originalMax: ORIGINAL_MAX[1] },
      elevation: { max: calibratedMax[2], correlation: correlations.elevation, originalMax: ORIGINAL_MAX[2] },
      precipitation: { max: calibratedMax[3], correlation: correlations.precipitation, originalMax: ORIGINAL_MAX[3] },
      temperature: { max: calibratedMax[4], correlation: correlations.temperature, originalMax: ORIGINAL_MAX[4] }
    },
    overallCorrelation: { before: corrBefore, after: corrAfter, improvement: corrAfter - corrBefore },
    perSpecies
  };

  console.log(`  Overall correlation: ${corrBefore.toFixed(4)} → ${corrAfter.toFixed(4)} (${corrAfter > corrBefore ? '+' : ''}${(corrAfter - corrBefore).toFixed(4)})`);
  console.log(`  Calibrated weights: season=${calibratedMax[0]}, habitat=${calibratedMax[1]}, elevation=${calibratedMax[2]}, precip=${calibratedMax[3]}, temp=${calibratedMax[4]}`);

  return calibration;
}

export { runBacktest, buildActualDensityMatrix };
