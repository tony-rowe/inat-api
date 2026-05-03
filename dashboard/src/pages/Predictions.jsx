import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { useApi } from '../hooks/useApi';
import { SeasonalChart } from '../components/Charts';
import LoadingSpinner from '../components/LoadingSpinner';
import { MONTH_FULL, MONTHS, formatNumber } from '../utils/formatters';

const PNW_CENTER = [44.0, -120.5];
const PNW_ZOOM = 7;
const PNW_MAX_BOUNDS = L.latLngBounds([40.0, -130.0], [50.5, -110.0]);

function scoreColor(score) {
  if (score >= 75) return '#22c55e';
  if (score >= 55) return '#84cc16';
  if (score >= 40) return '#facc15';
  if (score >= 25) return '#f97316';
  return '#6b7280';
}

function scoreBg(score) {
  if (score >= 75) return 'rgba(34, 197, 94, 0.35)';
  if (score >= 55) return 'rgba(132, 204, 22, 0.3)';
  if (score >= 40) return 'rgba(250, 204, 21, 0.25)';
  if (score >= 25) return 'rgba(249, 115, 22, 0.2)';
  return 'rgba(107, 114, 128, 0.12)';
}

function confidenceLabel(c) {
  switch (c) {
    case 'very-high': return 'Very High';
    case 'high': return 'High';
    case 'moderate': return 'Moderate';
    default: return 'Low';
  }
}

function FactorBar({ label, score, maxScore, color }) {
  const pct = (score / maxScore) * 100;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-green-700 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-green-950/60 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color || scoreColor(score * 2.5) }} />
      </div>
      <span className="text-[10px] text-green-700 w-8 text-right">{score}/{maxScore}</span>
    </div>
  );
}

function PredictionRegionLayer({ geojson, predictions, selectedSpecies, onRegionClick, selectedRegion }) {
  const map = useMap();

  const predMap = useMemo(() => {
    const m = {};
    (predictions || []).forEach(p => { m[p.region?.id || p.regionId] = p; });
    return m;
  }, [predictions]);

  const style = (feature) => {
    const pred = predMap[feature.properties.id];
    const score = pred?.score || 0;
    const isSelected = selectedRegion === feature.properties.id;
    return {
      fillColor: scoreColor(score),
      fillOpacity: isSelected ? 0.5 : score >= 40 ? 0.3 : 0.1,
      color: isSelected ? '#F59E0B' : scoreColor(score),
      weight: isSelected ? 3 : 1.5,
      opacity: isSelected ? 1 : 0.7
    };
  };

  const onEachFeature = (feature, layer) => {
    const pred = predMap[feature.properties.id];
    const score = pred?.score || 0;
    layer.bindTooltip(
      `<div style="text-align:center"><strong>${feature.properties.name}</strong><br/>Score: <b>${score}</b>/110<br/>${pred ? confidenceLabel(pred.confidence) : ''}</div>`,
      { sticky: true, className: 'prediction-tooltip' }
    );
    layer.on('click', () => onRegionClick(feature.properties.id));
  };

  if (!geojson) return null;

  return <GeoJSON key={`${selectedSpecies}-${selectedRegion}-${JSON.stringify(predMap).length}`} data={geojson} style={style} onEachFeature={onEachFeature} />;
}

export default function Predictions() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [regionDetail, setRegionDetail] = useState(null);

  const { data: speciesData } = useApi('/species');
  const { data: geojsonData } = useApi('/regions/geojson');
  const { data: topPicksData, loading: topLoading } = useApi(`/predictions?month=${month}&limit=15`);

  const [speciesPreds, setSpeciesPreds] = useState(null);
  const [speciesPredsLoading, setSpeciesPredsLoading] = useState(false);

  const species = speciesData?.species || [];
  const topPicks = topPicksData?.topPicks || [];
  const geojson = geojsonData;

  useEffect(() => {
    if (selectedSpecies) {
      setSpeciesPredsLoading(true);
      fetch(`/api/predictions/species/${selectedSpecies}?month=${month}`)
        .then(r => r.json())
        .then(d => { setSpeciesPreds(d.predictions || []); setSpeciesPredsLoading(false); })
        .catch(() => setSpeciesPredsLoading(false));
    } else {
      setSpeciesPreds(null);
    }
  }, [selectedSpecies, month]);

  useEffect(() => {
    if (selectedRegion) {
      fetch(`/api/predictions/region/${selectedRegion}?month=${month}`)
        .then(r => r.json())
        .then(d => setRegionDetail(d.predictions || []))
        .catch(() => {});
    } else {
      setRegionDetail(null);
    }
  }, [selectedRegion, month]);

  const selectedSpeciesObj = species.find(s => s.id === selectedSpecies);
  const mapPredictions = speciesPreds || topPicks;

  const topForMonth = topPicks.filter(p => p.score >= 50).slice(0, 5);
  const heroRec = topForMonth[0];

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-green-900 mb-1">Regional Forecast</h1>
          <p className="text-green-700 text-sm">
            {selectedSpeciesObj
              ? `${selectedSpeciesObj.commonName} predictions for ${MONTH_FULL[month - 1]}`
              : `Regional suitability model for ${MONTH_FULL[month - 1]}`
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-green-700">Month:</span>
          <div className="flex gap-0.5">
            {MONTHS.map((m, i) => (
              <button
                key={i}
                onClick={() => { setMonth(i + 1); setSelectedRegion(null); }}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                  month === i + 1
                    ? 'bg-mushroom-gold text-black'
                    : 'bg-green-100 text-green-800 hover:text-green-900'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {heroRec && !selectedSpecies && (
        <div className="glass-card p-5 border-mushroom-gold/30 pulse-glow">
          <div className="flex items-center gap-3 mb-2">
            <div>
              <p className="text-xs text-mushroom-gold uppercase font-mono tracking-widest">Top Recommendation for {MONTH_FULL[month - 1]}</p>
              <h2 className="text-xl font-bold text-green-900">{heroRec.species.commonName} — {heroRec.region.name}</h2>
            </div>
            <div className="ml-auto text-right">
              <p className="text-3xl font-bold" style={{ color: scoreColor(heroRec.score) }}>{heroRec.score}</p>
              <p className="text-[10px] text-green-700">/ 110</p>
            </div>
          </div>
          <p className="text-sm text-green-800">{heroRec.tip}</p>
          <p className="text-xs text-green-600 mt-2">{heroRec.accessTip}</p>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => { setSelectedSpecies(null); setSelectedRegion(null); }}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            !selectedSpecies ? 'bg-mushroom-gold text-black' : 'bg-green-100 text-green-800 hover:text-green-900'
          }`}
        >
          All Species
        </button>
        {species.map(s => (
          <button
            key={s.id}
            onClick={() => { setSelectedSpecies(s.id === selectedSpecies ? null : s.id); setSelectedRegion(null); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              selectedSpecies === s.id ? 'bg-mushroom-gold text-black' : 'bg-green-100 text-green-800 hover:text-green-900'
            }`}
            title={s.commonName}
          >
            <span>{s.commonName}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="glass-card p-4 overflow-hidden" style={{ height: '550px' }}>
            <MapContainer
              center={PNW_CENTER}
              zoom={PNW_ZOOM}
              style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
              maxBounds={PNW_MAX_BOUNDS}
              maxBoundsViscosity={0.8}
              minZoom={5}
              maxZoom={12}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; CARTO'
              />
              <PredictionRegionLayer
                geojson={geojson}
                predictions={mapPredictions}
                selectedSpecies={selectedSpecies}
                onRegionClick={setSelectedRegion}
                selectedRegion={selectedRegion}
              />
            </MapContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-3">
            <span className="text-[10px] text-green-700">Score:</span>
            {[
              { label: '75+ Go Now', color: '#22c55e' },
              { label: '55+ Strong', color: '#84cc16' },
              { label: '40+ Possible', color: '#facc15' },
              { label: '25+ Marginal', color: '#f97316' },
              { label: '< 25 Low', color: '#6b7280' }
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ background: l.color, opacity: 0.6 }} />
                <span className="text-[10px] text-green-700">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {selectedRegion && regionDetail ? (
            <RegionDetailPanel
              regionDetail={regionDetail}
              selectedRegion={selectedRegion}
              month={month}
              onClose={() => setSelectedRegion(null)}
            />
          ) : selectedSpecies && speciesPreds ? (
            <SpeciesRegionList
              predictions={speciesPreds}
              species={selectedSpeciesObj}
              onRegionClick={setSelectedRegion}
            />
          ) : (
            <TopPicksList picks={topPicks} loading={topLoading} month={month} />
          )}
        </div>
      </div>
    </div>
  );
}

function TopPicksList({ picks, loading, month }) {
  if (loading) return <LoadingSpinner message="Computing predictions..." />;
  const good = picks.filter(p => p.score >= 35);
  return (
    <div className="glass-card p-4 max-h-[580px] overflow-y-auto">
      <h3 className="text-sm font-semibold text-green-900 mb-3">Top Recommendations — {MONTH_FULL[month - 1]}</h3>
      {good.length === 0 && <p className="text-xs text-green-700">No high-confidence recommendations for this month.</p>}
      <div className="space-y-2">
        {good.map((p, i) => (
          <div key={i} className="p-3 rounded-xl transition-all" style={{ background: scoreBg(p.score) }}>
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-xs font-semibold text-green-900">{p.species.commonName}</p>
                <p className="text-[10px] text-green-700">{p.region.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold" style={{ color: scoreColor(p.score) }}>{p.score}</p>
                <p className="text-[9px] text-green-700">{confidenceLabel(p.confidence)}</p>
              </div>
            </div>
            <FactorBar label="Season" score={p.factors.season.score} maxScore={40} />
            <FactorBar label="Habitat" score={p.factors.habitat.score} maxScore={25} />
            <FactorBar label="Elevation" score={p.factors.elevation.score} maxScore={15} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SpeciesRegionList({ predictions, species, onRegionClick }) {
  return (
    <div className="glass-card p-4 max-h-[580px] overflow-y-auto">
      <h3 className="text-sm font-semibold text-green-900 mb-1">
        {species?.commonName}
      </h3>
      <p className="text-[10px] text-green-700 mb-3">Ranked by foraging potential across Oregon zones</p>
      <div className="space-y-2">
        {predictions.map(p => (
          <button
            key={p.regionId}
            onClick={() => onRegionClick(p.regionId)}
            className="w-full text-left p-3 rounded-xl transition-all hover:scale-[1.01]"
            style={{ background: scoreBg(p.score) }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-green-900">{p.region.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-green-700">{confidenceLabel(p.confidence)}</span>
                <span className="text-sm font-bold" style={{ color: scoreColor(p.score) }}>{p.score}</span>
              </div>
            </div>
            <p className="text-[10px] text-green-700 mb-1">{p.factors.season.label} · {p.factors.habitat.label}</p>
            <FactorBar label="Season" score={p.factors.season.score} maxScore={40} />
            <FactorBar label="Habitat" score={p.factors.habitat.score} maxScore={25} />
          </button>
        ))}
      </div>
    </div>
  );
}

function RegionDetailPanel({ regionDetail, selectedRegion, month, onClose }) {
  const good = regionDetail.filter(p => p.score >= 25);
  return (
    <div className="glass-card p-4 max-h-[580px] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-green-900">
          {regionDetail[0]?.region?.name || selectedRegion}
        </h3>
        <button onClick={onClose} className="text-green-700 hover:text-green-900 text-xs">Close</button>
      </div>
      <p className="text-[10px] text-green-700 mb-3">Species predictions for {MONTH_FULL[month - 1]}</p>
      {good.length === 0 && <p className="text-xs text-green-700">No species expected in this region this month.</p>}
      <div className="space-y-2">
        {good.map(p => (
          <div key={p.speciesId} className="p-3 rounded-xl" style={{ background: scoreBg(p.score) }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-green-900">{p.species.commonName}</p>
              <span className="text-sm font-bold" style={{ color: scoreColor(p.score) }}>{p.score}</span>
            </div>
            <div className="space-y-0.5">
              <FactorBar label="Season" score={p.factors.season.score} maxScore={40} />
              <FactorBar label="Habitat" score={p.factors.habitat.score} maxScore={25} />
              <FactorBar label="Elevation" score={p.factors.elevation.score} maxScore={15} />
              <FactorBar label="Rain" score={p.factors.precipitation.score} maxScore={10} />
              <FactorBar label="Temp" score={p.factors.temperature.score} maxScore={10} />
              <FactorBar label="History" score={p.factors.historical.score} maxScore={10} />
            </div>
            {p.tip && <p className="text-[10px] text-green-700 mt-2 leading-relaxed">{p.tip}</p>}
            {p.accessTip && <p className="text-[10px] text-green-600 mt-1">{p.accessTip}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
