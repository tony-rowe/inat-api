import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const HEATMAP_SCRIPT = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';

const PNW_CENTER = [44.0, -120.5];
const PNW_ZOOM = 7;
const PNW_MAX_BOUNDS = L.latLngBounds([40.0, -130.0], [50.5, -110.0]);

const TILE_LAYERS = {
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com">CARTO</a>',
    label: 'Light'
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    label: 'Terrain'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    label: 'Satellite'
  }
};

let heatScriptLoaded = false;
function loadHeatScript() {
  if (heatScriptLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (window.L?.heatLayer) { heatScriptLoaded = true; resolve(); return; }
    const s = document.createElement('script');
    s.src = HEATMAP_SCRIPT;
    s.onload = () => { heatScriptLoaded = true; resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function HeatLayer({ points, options = {} }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    loadHeatScript().then(() => {
      if (!mounted || !window.L?.heatLayer) return;

      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }

      if (points.length === 0) return;

      const heatPoints = points.map(p => [p.latitude, p.longitude, 0.6]);
      layerRef.current = window.L.heatLayer(heatPoints, {
        radius: options.radius || 18,
        blur: options.blur || 25,
        maxZoom: options.maxZoom || 13,
        max: options.max || 1.0,
        gradient: options.gradient || {
          0.0: '#0a2f1a',
          0.2: '#166534',
          0.4: '#22c55e',
          0.6: '#facc15',
          0.8: '#f97316',
          1.0: '#dc2626'
        },
        minOpacity: 0.4,
        ...options
      }).addTo(map);
    });

    return () => {
      mounted = false;
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [points, map, options.radius, options.blur]);

  return null;
}

function FitBounds({ points }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (points.length > 0 && !fitted.current) {
      const dataBounds = L.latLngBounds(points.map(p => [p.latitude, p.longitude]));
      if (dataBounds.isValid()) {
        const clampedBounds = L.latLngBounds(
          [Math.max(dataBounds.getSouth(), PNW_MAX_BOUNDS.getSouth()), Math.max(dataBounds.getWest(), PNW_MAX_BOUNDS.getWest())],
          [Math.min(dataBounds.getNorth(), PNW_MAX_BOUNDS.getNorth()), Math.min(dataBounds.getEast(), PNW_MAX_BOUNDS.getEast())]
        );
        if (clampedBounds.isValid()) {
          map.fitBounds(clampedBounds, { padding: [40, 40], maxZoom: 11 });
        }
        fitted.current = true;
      }
    }
  }, [points, map]);

  return null;
}

function ResetFitOnChange({ resetKey }) {
  const fittedRef = useRef(null);

  useEffect(() => {
    if (fittedRef.current) {
      fittedRef.current = false;
    }
  }, [resetKey]);

  return null;
}

function FireLayer({ fireData }) {
  if (!fireData || !fireData.features?.length) return null;

  const style = (feature) => {
    const acres = feature.properties?.acres || 0;
    const opacity = Math.min(0.6, 0.2 + (acres / 50000) * 0.4);
    return {
      fillColor: '#ef4444',
      fillOpacity: opacity,
      color: '#dc2626',
      weight: 1.5,
      opacity: 0.8,
      dashArray: '4 2'
    };
  };

  const onEachFeature = (feature, layer) => {
    const p = feature.properties || {};
    layer.bindTooltip(
      `<div style="text-align:center"><strong>${p.name}</strong><br/>${p.acres?.toLocaleString()} acres (${p.year})</div>`,
      { sticky: true, className: 'fire-tooltip' }
    );
  };

  return <GeoJSON key={JSON.stringify(fireData).length} data={fireData} style={style} onEachFeature={onEachFeature} />;
}

export default function HeatMap({
  points = [],
  height = '500px',
  className = '',
  showControls = true,
  speciesFilter = null,
  species = [],
  onSpeciesFilterChange,
  showFireOverlay = true
}) {
  const [radius, setRadius] = useState(18);
  const [blur, setBlur] = useState(25);
  const [tileLayer, setTileLayer] = useState('light');
  const [fireYear, setFireYear] = useState(null);
  const [fireData, setFireData] = useState(null);
  const [fireYears, setFireYears] = useState([]);
  const [fireLoading, setFireLoading] = useState(false);

  useEffect(() => {
    if (showFireOverlay) {
      fetch('/api/fires/years').then(r => r.json()).then(d => setFireYears(d.years || [])).catch(() => {});
    }
  }, [showFireOverlay]);

  useEffect(() => {
    if (!fireYear) { setFireData(null); return; }
    setFireLoading(true);
    fetch(`/api/fires/${fireYear}`).then(r => r.json()).then(d => { setFireData(d); setFireLoading(false); }).catch(() => setFireLoading(false));
  }, [fireYear]);

  const tile = TILE_LAYERS[tileLayer];

  return (
    <div className={`relative ${className}`}>
      <div style={{ height }} className="rounded-2xl overflow-hidden border border-green-300">
        <MapContainer
          center={PNW_CENTER}
          zoom={PNW_ZOOM}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          maxBounds={PNW_MAX_BOUNDS}
          maxBoundsViscosity={0.8}
          minZoom={5}
          maxZoom={15}
        >
          <TileLayer
            key={tileLayer}
            url={tile.url}
            attribution={tile.attribution}
          />
          <HeatLayer points={points} options={{ radius, blur }} />
          {fireData && <FireLayer fireData={fireData} />}
          <FitBounds points={points} />
        </MapContainer>
      </div>

      {showFireOverlay && fireYears.length > 0 && (
        <div className="absolute top-4 left-4 glass-card p-3 z-[1000] max-w-[200px]">
          <p className="text-[10px] font-mono uppercase tracking-widest text-red-500 mb-1.5">Fire Overlays</p>
          <div className="flex flex-wrap gap-1">
            <button onClick={() => setFireYear(null)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium ${!fireYear ? 'bg-gray-600 text-white' : 'bg-green-900/40 text-gray-500 hover:text-white'}`}>Off</button>
            {fireYears.slice(0, 10).map(y => (
              <button key={y} onClick={() => setFireYear(y === fireYear ? null : y)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                  fireYear === y ? 'bg-red-600 text-white' : 'bg-green-900/40 text-gray-500 hover:text-red-400'
                }`}>{y}</button>
            ))}
          </div>
          {fireLoading && <p className="text-[10px] text-gray-500 mt-1">Loading fire data...</p>}
          {fireData && !fireLoading && (
            <p className="text-[10px] text-red-400/80 mt-1">
              {fireData.features?.length || 0} fires shown ({fireYear})
            </p>
          )}
        </div>
      )}

      {showControls && (
        <div className="absolute bottom-4 right-4 glass-card p-3 space-y-2 z-[1000]">
          <div className="flex gap-1 mb-1">
            {Object.entries(TILE_LAYERS).map(([key, layer]) => (
              <button
                key={key}
                onClick={() => setTileLayer(key)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                  tileLayer === key
                    ? 'bg-mushroom-gold text-black'
                    : 'bg-green-900/60 text-gray-400 hover:text-white'
                }`}
              >
                {layer.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-12">Radius</span>
            <input
              type="range" min="5" max="40" value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              className="w-20 accent-mushroom-gold"
            />
            <span className="text-[10px] text-gray-500 w-6">{radius}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-12">Blur</span>
            <input
              type="range" min="5" max="50" value={blur}
              onChange={e => setBlur(Number(e.target.value))}
              className="w-20 accent-mushroom-gold"
            />
            <span className="text-[10px] text-gray-500 w-6">{blur}</span>
          </div>

          <div className="flex items-center gap-1 pt-1">
            <div className="h-2 flex-1 rounded-full" style={{
              background: 'linear-gradient(to right, #0a2f1a, #166534, #22c55e, #facc15, #f97316, #dc2626)'
            }} />
          </div>
          <div className="flex justify-between text-[9px] text-gray-500">
            <span>Low</span><span>High</span>
          </div>
        </div>
      )}

      {species.length > 0 && onSpeciesFilterChange && (
        <div className="absolute top-4 right-4 glass-card p-3 z-[1000] max-h-60 overflow-y-auto">
          <p className="text-[10px] font-mono uppercase tracking-widest text-green-600 mb-2">Filter Species</p>
          <label className="flex items-center gap-2 text-xs text-gray-300 mb-1 cursor-pointer">
            <input
              type="checkbox"
              checked={!speciesFilter}
              onChange={() => onSpeciesFilterChange(null)}
              className="accent-mushroom-gold"
            />
            All Species
          </label>
          {species.map(s => (
            <label key={s.id} className="flex items-center gap-2 text-xs text-gray-400 mb-0.5 cursor-pointer hover:text-gray-200">
              <input
                type="checkbox"
                checked={speciesFilter === s.taxonId}
                onChange={() => onSpeciesFilterChange(speciesFilter === s.taxonId ? null : s.taxonId)}
                className="accent-mushroom-gold"
              />
              <span className="truncate">{s.commonName}</span>
            </label>
          ))}
        </div>
      )}

      <div className="absolute bottom-4 left-4 glass-card px-3 py-1.5 z-[1000]">
        <span className="text-xs text-gray-400">
          <span className="text-mushroom-gold font-semibold">{points.length.toLocaleString()}</span> observations
        </span>
      </div>
    </div>
  );
}
