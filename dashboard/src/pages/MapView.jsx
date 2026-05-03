import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import HeatMap from '../components/HeatMap';
import LoadingSpinner from '../components/LoadingSpinner';

export default function MapView() {
  const { data: speciesData } = useApi('/species');
  const [selectedTaxon, setSelectedTaxon] = useState(null);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const species = speciesData?.species || [];

  useEffect(() => {
    setLoading(true);
    const url = selectedTaxon ? `/api/heatmap?taxon_id=${selectedTaxon}` : '/api/heatmap';
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setPoints(data.points || []);
        setTotalCount(data.count || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedTaxon]);

  const selectedSpecies = species.find(s => s.taxonId === selectedTaxon);

  return (
    <div className="fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-green-900 mb-1">
            Spatial Heatmap
          </h1>
          <p className="text-green-700 text-xs sm:text-sm">
            {selectedSpecies
              ? `Showing observations for ${selectedSpecies.commonName}`
              : 'All cached PNW observations'}
          </p>
        </div>
      </div>

      <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <label htmlFor="map-taxon" className="text-sm font-medium text-green-900 min-w-36">
          Spatial Analysis Taxon
        </label>
        <select
          id="map-taxon"
          value={selectedTaxon || ''}
          onChange={(event) => setSelectedTaxon(event.target.value ? parseInt(event.target.value, 10) : null)}
          className="w-full sm:max-w-lg bg-white border border-green-300 rounded-xl px-3 py-2 text-sm text-green-900 focus:outline-none focus:border-mushroom-gold"
        >
          <option value="">All species ({totalCount.toLocaleString()})</option>
          {species.map((s) => (
            <option key={s.id} value={s.taxonId}>
              {s.commonName}
            </option>
          ))}
        </select>
        {selectedSpecies && (
          <p className="text-xs text-green-700">
            Common name: <span className="font-semibold text-green-900">{selectedSpecies.commonName}</span>
          </p>
        )}
      </div>

      {loading ? (
        <LoadingSpinner message="Loading heatmap..." />
      ) : (
        <HeatMap
          points={points}
          height="calc(100vh - 220px)"
          showControls={true}
        />
      )}
    </div>
  );
}
