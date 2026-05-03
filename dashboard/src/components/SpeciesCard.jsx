import { Link } from 'react-router-dom';
import { formatNumber, MONTHS } from '../utils/formatters';

export default function SpeciesCard({ species, stats }) {
  const peakMonths = species.season?.peak?.map(m => MONTHS[m - 1]).join(', ') || 'Unknown';
  const obsCount = stats?.total || 0;

  return (
    <Link to={`/species/${species.id}`} className="glass-card-hover p-5 block group">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 text-green-900 text-sm font-semibold flex items-center justify-center">
          {(species.commonName || 'S').charAt(0)}
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-mushroom-gold">{formatNumber(obsCount)}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">observations</div>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-green-900 group-hover:text-mushroom-gold transition-colors leading-tight">
        {species.commonName}
      </h3>
      <p className="text-xs text-green-600 italic mt-0.5">{species.scientificName}</p>

      <p className="text-xs text-green-700 mt-2 line-clamp-2 leading-relaxed">{species.description}</p>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className="stat-badge">
          Peak: {peakMonths}
        </span>
        <span className="stat-badge" style={{ borderColor: `${species.color}40`, color: species.color }}>
          {species.edibility}
        </span>
      </div>

      <div className="mt-3 flex gap-0.5">
        {Array.from({ length: 12 }, (_, i) => {
          const isActive = species.season && isInSeason(i + 1, species.season);
          const isPeak = species.season?.peak?.includes(i + 1);
          return (
            <div
              key={i}
              className="flex-1 h-1.5 rounded-full transition-all"
              style={{
                background: isPeak
                  ? species.color || '#F59E0B'
                  : isActive
                    ? `${species.color || '#22c55e'}60`
                    : '#1a2e1a'
              }}
              title={MONTHS[i]}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-green-600">Jan</span>
        <span className="text-[9px] text-green-600">Dec</span>
      </div>
    </Link>
  );
}

function isInSeason(month, season) {
  if (!season) return false;
  if (season.start <= season.end) {
    return month >= season.start && month <= season.end;
  }
  return month >= season.start || month <= season.end;
}
