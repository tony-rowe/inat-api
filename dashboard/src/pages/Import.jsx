import { useState, useEffect } from 'react';
import { apiGet } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Import() {
  const [taxonId, setTaxonId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [imported, setImported] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    fetch('/api/imported').then(r => r.json()).then(d => { setImported(d.species || []); setLoadingList(false); }).catch(() => setLoadingList(false));
  }, [result]);

  const handleImport = async () => {
    if (!taxonId || isNaN(parseInt(taxonId))) { setError('Enter a valid taxon ID (number)'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch('/api/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxonId: parseInt(taxonId) })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      setTaxonId('');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    await fetch(`/api/imported/${id}`, { method: 'DELETE' });
    setImported(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="fade-in space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-green-900 mb-1">Import Species</h1>
        <p className="text-green-700 text-sm">Add an iNaturalist taxon ID to register a new species in the system</p>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-green-900 mb-3">Add by Taxon ID</h2>
        <p className="text-xs text-green-700 mb-4">
          Find a species on <a href="https://www.inaturalist.org" target="_blank" rel="noopener noreferrer" className="text-mushroom-gold hover:underline">iNaturalist.org</a>,
          copy the taxon ID from the URL (e.g., <code className="text-green-400">/taxa/48978</code> → <code className="text-mushroom-gold">48978</code>), and paste it below.
        </p>

        <div className="flex gap-3 items-start">
          <div className="flex-1">
            <input
              type="text"
              value={taxonId}
              onChange={e => setTaxonId(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleImport()}
              placeholder="e.g. 48978"
              className="w-full bg-green-950/40 border border-green-800/30 rounded-xl px-4 py-3 text-lg text-white placeholder-gray-600 focus:outline-none focus:border-mushroom-gold/50 font-mono"
              disabled={loading}
            />
          </div>
          <button onClick={handleImport} disabled={loading || !taxonId} className="btn-primary px-6 py-3 text-lg">
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Importing...
              </span>
            ) : 'Import'}
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-red-950/30 border border-red-800/30 text-red-400 text-sm">{error}</div>
        )}

        {result && (
          <div className="mt-4 p-4 rounded-xl border fade-in" style={{
            background: result.status === 'imported' ? 'rgba(34,197,94,0.1)' : 'rgba(250,204,21,0.1)',
            borderColor: result.status === 'imported' ? 'rgba(34,197,94,0.3)' : 'rgba(250,204,21,0.3)'
          }}>
            <div className="flex items-center gap-3 mb-2">
              <div>
                <p className="text-sm font-semibold text-green-900">{result.species?.commonName}</p>
                <p className="text-xs text-green-500 italic">{result.species?.scientificName}</p>
              </div>
              <span className="ml-auto text-xs px-2 py-1 rounded-full" style={{
                background: result.status === 'imported' ? 'rgba(34,197,94,0.2)' : 'rgba(250,204,21,0.2)',
                color: result.status === 'imported' ? '#22c55e' : '#facc15'
              }}>
                {result.status === 'imported' ? 'Imported' : 'Already exists'}
              </span>
            </div>
            <p className="text-xs text-green-700">{result.message}</p>
            {result.species && (
              <div className="grid grid-cols-3 gap-3 mt-3">
                <MiniInfo label="Category" value={result.species.category} />
                <MiniInfo label="Observations" value={result.syncResult?.total || result.species.iNatObservations || '—'} />
                <MiniInfo label="Taxon ID" value={result.species.taxonId} />
              </div>
            )}
            <p className="text-[10px] text-green-700 mt-3">
              This species is now in the dashboard, predictions, field guide, and quiz. Edit forager scores and ecology data in the server files to refine predictions.
            </p>
          </div>
        )}

        <div className="mt-4 glass-card p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-green-600 mb-2">What happens on import</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-green-700">
            <Step n="1" text="Fetches taxonomy, photos, Wikipedia summary from iNaturalist" />
            <Step n="2" text="Auto-detects category (fungi, berry, plant, flower, fish, etc.)" />
            <Step n="3" text="Generates default season, ecology, and forager score" />
            <Step n="4" text="Syncs observations in Oregon and Washington" />
            <Step n="5" text="Adds to predictions, heatmaps, field guide, and quiz" />
            <Step n="6" text="Included in next backtest calibration run" />
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold text-green-900 mb-3">User-Imported Species ({imported.length})</h2>
        {loadingList ? <LoadingSpinner message="Loading..." size="sm" /> : imported.length === 0 ? (
          <p className="text-sm text-gray-600">No user-imported species yet. Use the form above to add one.</p>
        ) : (
          <div className="space-y-2">
            {imported.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-green-950/30 border border-green-800/20">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm text-green-900 font-medium">{s.commonName}</p>
                    <p className="text-[10px] text-green-700">{s.scientificName} · taxon {s.taxonId} · {s.category}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(s.id)} className="text-xs text-red-400/60 hover:text-red-400 px-2 py-1">Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniInfo({ label, value }) {
  return (
    <div className="bg-green-950/40 rounded-lg px-3 py-2">
      <p className="text-[9px] text-green-700 uppercase">{label}</p>
      <p className="text-xs text-green-900 capitalize">{String(value)}</p>
    </div>
  );
}

function Step({ n, text }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-4 h-4 rounded-full bg-mushroom-gold/20 text-mushroom-gold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">{n}</span>
      <span>{text}</span>
    </div>
  );
}
