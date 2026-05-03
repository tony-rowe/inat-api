import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useApi, apiPost } from '../hooks/useApi';
import HeatMap from '../components/HeatMap';
import { SeasonalChart, QualityPieChart, YearlyTrendChart } from '../components/Charts';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatNumber, MONTHS, MONTH_FULL, timeAgo, qualityGradeLabel, qualityGradeColor } from '../utils/formatters';

export default function SpeciesDetail() {
  const { id } = useParams();
  const { data, loading, error, refetch } = useApi(`/species/${id}`);
  const [heatmapData, setHeatmapData] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const species = data?.species;
  const taxonDetails = data?.taxonDetails;
  const stats = data?.stats;

  useEffect(() => {
    if (species) {
      fetch(`/api/heatmap?taxon_id=${species.taxonId}`)
        .then(r => r.json())
        .then(d => setHeatmapData(d))
        .catch(() => {});
    }
  }, [species]);

  const handleSync = async () => {
    if (!species) return;
    setSyncing(true);
    try {
      await apiPost(`/sync/${species.taxonId}?force=true`);
      await new Promise(r => setTimeout(r, 2000));
      refetch();
      if (species) {
        const hm = await fetch(`/api/heatmap?taxon_id=${species.taxonId}`).then(r => r.json());
        setHeatmapData(hm);
      }
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading species data..." />;
  if (error || !species) return (
    <div className="text-center py-20">
      <p className="text-red-400 mb-4">Species not found</p>
      <Link to="/species" className="btn-primary">← Back to Species</Link>
    </div>
  );

  const currentMonth = new Date().getMonth() + 1;
  const isInSeason = (() => {
    const { start, end } = species.season || {};
    if (!start) return false;
    if (start <= end) return currentMonth >= start && currentMonth <= end;
    return currentMonth >= start || currentMonth <= end;
  })();
  const isPeak = species.season?.peak?.includes(currentMonth);

  return (
    <div className="fade-in space-y-6 max-w-6xl">
      <Link to="/species" className="text-xs text-green-700 hover:text-mushroom-gold transition-colors inline-flex items-center gap-1">
        ← Back to Species Guide
      </Link>

      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-shrink-0">
            {taxonDetails?.photoUrl ? (
              <img
                src={taxonDetails.photoUrl}
                alt={species.commonName}
                className="w-48 h-48 rounded-2xl object-cover border-2 border-green-800/30"
              />
            ) : (
              <div className="w-48 h-48 rounded-2xl bg-green-900/30 flex items-center justify-center text-6xl border-2 border-green-800/30">
                {species.commonName?.charAt(0) || 'S'}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-green-900 mb-1">{species.commonName}</h1>
                <p className="text-green-500 italic text-lg">{species.scientificName}</p>
              </div>
              <div className="flex gap-2">
                {isInSeason && (
                  <span className={`stat-badge ${isPeak ? 'pulse-glow !border-mushroom-gold/60 !text-mushroom-gold' : ''}`}>
                    {isPeak ? 'Peak Season' : 'In Season'}
                  </span>
                )}
                <button onClick={handleSync} disabled={syncing} className="btn-primary text-xs">
                  {syncing ? 'Syncing...' : 'Refresh'}
                </button>
              </div>
            </div>

            <p className="text-green-700 mt-3 text-sm leading-relaxed">{species.description}</p>

            {taxonDetails?.wikipediaSummary && (
              <p className="text-green-700 mt-2 text-xs leading-relaxed line-clamp-3"
                 dangerouslySetInnerHTML={{ __html: taxonDetails.wikipediaSummary }} />
            )}

            <div className="flex flex-wrap gap-3 mt-4">
              <InfoPill label="Edibility" value={species.edibility} />
              <InfoPill label="Habitat" value={species.habitat} />
              <InfoPill
                label="Season"
                value={`${MONTH_FULL[(species.season?.start || 1) - 1]} – ${MONTH_FULL[(species.season?.end || 12) - 1]}`}
              />
              <InfoPill
                label="Peak"
                value={species.season?.peak?.map(m => MONTHS[m - 1]).join(', ') || 'N/A'}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 mt-5">
              <MiniStat label="Total Observations" value={formatNumber(stats?.total || 0)} color="text-mushroom-gold" />
              <MiniStat
                label="Research Grade"
                value={formatNumber(stats?.byQuality?.find(q => q.quality_grade === 'research')?.count || 0)}
                color="text-green-400"
              />
              <MiniStat
                label="iNaturalist Global"
                value={formatNumber(taxonDetails?.observationsCount || 0)}
                color="text-blue-400"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold text-green-900 mb-1">Observation Heatmap</h2>
        <p className="text-xs text-green-700 mb-4">Geographic distribution across the Pacific Northwest</p>
        {heatmapData ? (
          <HeatMap points={heatmapData.points || []} height="450px" showControls={true} />
        ) : (
          <LoadingSpinner message="Loading heatmap..." />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h2 className="text-lg font-semibold text-green-900 mb-1">Seasonal Pattern</h2>
          <p className="text-xs text-green-700 mb-4">Monthly observation frequency</p>
          <SeasonalChart data={stats?.byMonth || []} height={260} />

          <div className="mt-4 flex gap-0.5">
            {Array.from({ length: 12 }, (_, i) => {
              const month = i + 1;
              const inSeason = (() => {
                const { start, end } = species.season || {};
                if (!start) return false;
                if (start <= end) return month >= start && month <= end;
                return month >= start || month <= end;
              })();
              const peak = species.season?.peak?.includes(month);
              return (
                <div key={i} className="flex-1 text-center">
                  <div
                    className="h-3 rounded-sm mb-1"
                    style={{
                      background: peak ? species.color || '#F59E0B'
                        : inSeason ? `${species.color || '#22c55e'}50`
                        : '#1a2e1a'
                    }}
                  />
                  <span className="text-[9px] text-green-700">{MONTHS[i]}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="text-lg font-semibold text-green-900 mb-1">Quality Distribution</h2>
          <p className="text-xs text-green-700 mb-4">Verification grades of observations</p>
          <QualityPieChart data={stats?.byQuality || []} height={260} />
        </div>
      </div>

      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold text-green-900 mb-1">Year-over-Year Trend</h2>
        <p className="text-xs text-green-700 mb-4">Observation count by year</p>
        <YearlyTrendChart data={stats?.byYear || []} height={260} />
      </div>

      {stats?.recentObs?.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="text-lg font-semibold text-green-900 mb-4">Recent Observations</h2>
          <div className="space-y-2">
            {stats.recentObs.map(obs => (
              <div key={obs.id} className="flex items-center gap-4 p-3 rounded-xl bg-green-950/30 hover:bg-green-900/30 transition-colors">
                {obs.photo_url ? (
                  <img src={obs.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-green-900/40 flex items-center justify-center text-xl flex-shrink-0">
                    {species.commonName?.charAt(0) || 'S'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-green-900 truncate">{obs.place_guess || 'Unknown location'}</p>
                  <p className="text-xs text-green-700">{obs.observed_on || 'No date'} · {obs.user_login}</p>
                </div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: `${qualityGradeColor(obs.quality_grade)}20`,
                    color: qualityGradeColor(obs.quality_grade)
                  }}
                >
                  {qualityGradeLabel(obs.quality_grade)}
                </span>
                <a
                  href={`https://www.inaturalist.org/observations/${obs.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-600 hover:text-mushroom-gold transition-colors"
                >
                  View ↗
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoPill({ label, value }) {
  return (
    <div className="bg-green-950/40 rounded-xl px-3 py-2 border border-green-800/20">
      <p className="text-[10px] text-green-700 uppercase tracking-wider">{label}</p>
      <p className="text-xs text-green-900 mt-0.5">{value}</p>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div className="text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-green-700 uppercase tracking-wider">{label}</p>
    </div>
  );
}
