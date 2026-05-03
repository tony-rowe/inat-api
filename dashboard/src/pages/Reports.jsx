import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';
import { useApi } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';
import { apiPost } from '../hooks/useApi';

const STREAMLIT_URL = import.meta.env.VITE_STREAMLIT_URL || 'http://desertbuddha:8501';

export default function Reports() {
  const { data: summaryData, loading: summaryLoading, error: summaryError, refetch: refetchSummary } = useApi('/reports/summary');
  const { data: liveData, loading: liveLoading, error: liveError } = useApi('/reports/live-weekly');
  const { data: outOfRegionData, loading: outOfRegionLoading, refetch: refetchOutOfRegion } = useApi('/cache/out-of-region');
  const [pruning, setPruning] = useState(false);
  const [pruneMessage, setPruneMessage] = useState('');
  const [alignmentData, setAlignmentData] = useState(null);
  const [alignmentLoading, setAlignmentLoading] = useState(false);

  const rollingSeries = liveData?.histogram || [];
  const topSpecies = liveData?.topSpecies || [];
  const total7d = liveData?.totalObservations || 0;
  const cache = summaryData?.cache || {};
  const outOfRegionCount = outOfRegionData?.outOfRegion || 0;
  const outOfRegionSample = outOfRegionData?.samples?.slice(0, 3) || [];

  const avgPerDay = useMemo(() => {
    if (!total7d) return 0;
    return (total7d / 7).toFixed(1);
  }, [total7d]);

  const byIconic = useMemo(() => {
    const grouped = new Map();
    for (const row of topSpecies) {
      const key = row.iconicTaxonName || 'Unknown';
      grouped.set(key, (grouped.get(key) || 0) + (row.count || 0));
    }
    return Array.from(grouped.entries()).map(([group, count]) => ({ group, count }));
  }, [topSpecies]);

  if (summaryLoading || liveLoading) return <LoadingSpinner message="Loading reporting data..." />;
  if (summaryError || liveError) return <p className="text-red-600 text-sm">Failed to load reports: {summaryError || liveError}</p>;

  const handleVerifyAlignment = async () => {
    setAlignmentLoading(true);
    setAlignmentData(null);
    try {
      const res = await fetch('/api/reports/api-alignment');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to verify');
      setAlignmentData(data);
    } catch (err) {
      setAlignmentData({ error: err.message });
    } finally {
      setAlignmentLoading(false);
    }
  };

  const handlePrune = async () => {
    setPruning(true);
    setPruneMessage('');
    try {
      const result = await apiPost('/cache/prune-out-of-region');
      const deleted = result?.deleted || 0;
      setPruneMessage(deleted > 0 ? `Pruned ${deleted.toLocaleString()} out-of-region observations.` : 'No out-of-region observations needed pruning.');
      await Promise.all([refetchOutOfRegion(), refetchSummary()]);
    } catch (err) {
      setPruneMessage(`Prune failed: ${err.message || 'Unknown error'}`);
    } finally {
      setPruning(false);
    }
  };

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-green-900 mb-1">Reporting Center</h1>
        <p className="text-green-700 text-sm">
          Live iNaturalist 7-day trend (plants + fungi across Oregon and Washington) plus local cache health.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Live observations (7d)" value={total7d.toLocaleString()} />
        <StatCard label="Average / day" value={avgPerDay} />
        <StatCard label="Live API calls used" value={String(liveData?.queryCount || 0)} />
        <StatCard label="Cached observations" value={cache.observations?.toLocaleString() || '0'} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="glass-card p-5 xl:col-span-2">
          <h2 className="text-lg font-semibold text-green-900 mb-1">iNaturalist rolling 7-day activity</h2>
          <p className="text-sm text-green-700 mb-4">Daily live observations in Oregon and Washington for plants + fungi.</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rollingSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#bbf7d0" />
                <XAxis dataKey="day" tick={{ fill: '#166534', fontSize: 11 }} />
                <YAxis tick={{ fill: '#166534', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid #86efac',
                    background: 'rgba(255,255,255,0.97)',
                    color: '#14532d'
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={2} dot={false} name="Daily (live)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="text-lg font-semibold text-green-900 mb-1">Top taxa (live, last 7 days)</h2>
          <p className="text-sm text-green-700 mb-4">Ranked directly from iNaturalist species counts.</p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {topSpecies.slice(0, 10).map((item) => (
              <div key={item.taxonId} className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2 border border-green-200">
                <div>
                  <p className="text-sm text-green-900">{item.commonName || item.scientificName}</p>
                  <p className="text-[10px] text-green-700">{item.iconicTaxonName || 'Unknown'}</p>
                </div>
                <p className="text-sm font-semibold text-green-700">{item.count.toLocaleString()}</p>
              </div>
            ))}
            {topSpecies.length === 0 && (
              <p className="text-sm text-green-700">No live observations in the last 7 days.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass-card p-5 xl:col-span-2">
          <h2 className="text-lg font-semibold text-green-900 mb-1">API status – alignment by taxon</h2>
          <p className="text-sm text-green-700 mb-4">
            Compare cached counts with iNaturalist API totals for every tracked taxon (research + needs_id, Oregon & Washington).
          </p>
          <button
            onClick={handleVerifyAlignment}
            disabled={alignmentLoading}
            className="btn-primary text-sm"
          >
            {alignmentLoading ? 'Verifying… (~1s per taxon)' : 'Verify API alignment'}
          </button>
          {alignmentData?.error && (
            <p className="text-sm text-red-600 mt-3">{alignmentData.error}</p>
          )}
          {alignmentData?.taxa && (
            <div className="mt-4 max-h-80 overflow-y-auto border border-green-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-green-50 sticky top-0">
                  <tr className="text-left text-green-900 font-medium">
                    <th className="py-2 px-3">Taxon</th>
                    <th className="py-2 px-3 text-right">Ours (cached)</th>
                    <th className="py-2 px-3 text-right">API total</th>
                    <th className="py-2 px-3 text-right">Difference</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {alignmentData.taxa.map((row) => (
                    <tr key={row.taxonId} className="border-t border-green-100 hover:bg-green-50/50">
                      <td className="py-2 px-3 text-green-900">{row.commonName}</td>
                      <td className="py-2 px-3 text-right">{row.ourCount?.toLocaleString() ?? '—'}</td>
                      <td className="py-2 px-3 text-right">{row.apiTotal != null ? row.apiTotal.toLocaleString() : (row.error || '—')}</td>
                      <td className="py-2 px-3 text-right">
                        {row.difference != null ? (
                          <span className={row.difference === 0 ? 'text-green-600 font-medium' : 'text-amber-600'}>
                            {row.difference >= 0 ? '+' : ''}{row.difference.toLocaleString()}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-2 px-3">
                        {row.error ? <span className="text-red-600">Error</span> : row.aligned ? (
                          <span className="text-green-600">✓ Aligned</span>
                        ) : row.aligned === false ? (
                          <span className="text-amber-600">Mismatch</span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="glass-card p-5">
          <h2 className="text-lg font-semibold text-green-900 mb-1">Live distribution by iconic taxon</h2>
          <p className="text-sm text-green-700 mb-4">How the live 7-day total splits across plants vs fungi.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byIconic}>
                <CartesianGrid strokeDasharray="3 3" stroke="#bbf7d0" />
                <XAxis dataKey="group" tick={{ fill: '#166534', fontSize: 11 }} />
                <YAxis tick={{ fill: '#166534', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid #86efac',
                    background: 'rgba(255,255,255,0.97)',
                    color: '#14532d'
                  }}
                />
                <Bar dataKey="count" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-green-700 mt-3">
            Cached live-report window: {liveData?.window?.d1 || 'n/a'} to {liveData?.window?.d2 || 'n/a'}.
          </p>
        </div>
        <div className="glass-card p-5">
          <h2 className="text-lg font-semibold text-green-900 mb-1">Cache and Streamlit</h2>
          <div className="space-y-2 text-sm text-green-800">
            <p><strong>Primary cache DB:</strong> <code className="text-xs">{cache.dbPath || 'dashboard/data/cache.db'}</code></p>
            <p><strong>DB size:</strong> {cache.dbSizeMb ?? 0} MB</p>
            <p><strong>Synced taxa:</strong> {cache.syncedTaxa ?? 0}</p>
            <p><strong>Latest cached observation:</strong> {cache.latestObservation || 'n/a'}</p>
            <p><strong>Out-of-region points:</strong> {outOfRegionLoading ? '...' : outOfRegionCount.toLocaleString()}</p>
          </div>
          <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-200">
            <p className="text-sm text-green-900 font-medium">PNW bounds cleanup</p>
            <p className="text-xs text-green-700 mt-1">
              Removes cached observations with coordinates outside Oregon/Washington bounds.
            </p>
            <button
              onClick={handlePrune}
              disabled={pruning || outOfRegionLoading}
              className="btn-primary mt-3 text-xs"
            >
              {pruning ? 'Pruning…' : 'Prune out-of-region observations'}
            </button>
            {pruneMessage && <p className="text-xs text-green-700 mt-2">{pruneMessage}</p>}
            {outOfRegionSample.length > 0 && (
              <div className="mt-2 text-[11px] text-green-700">
                <p className="font-medium text-green-900">Sample outliers:</p>
                <ul className="list-disc ml-4">
                  {outOfRegionSample.map((row) => (
                    <li key={row.id}>
                      #{row.id} ({row.latitude?.toFixed?.(2)}, {row.longitude?.toFixed?.(2)}) {row.place_guess || 'Unknown place'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200">
            <p className="text-sm text-green-900 font-medium">Streamlit reports are integrated as a companion app.</p>
            <p className="text-xs text-green-700 mt-1">
              Start it with <code>python3 -m streamlit run streamlit/app.py</code> and open:
            </p>
            <a href={STREAMLIT_URL} target="_blank" rel="noreferrer" className="text-sm text-green-800 underline break-all">
              {STREAMLIT_URL}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="glass-card p-4">
      <p className="text-sm text-green-700">{label}</p>
      <p className="text-2xl font-bold text-green-900">{value}</p>
    </div>
  );
}
