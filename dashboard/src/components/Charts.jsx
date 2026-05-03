import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend
} from 'recharts';
import { MONTHS, getSeasonColor, qualityGradeColor, qualityGradeLabel, formatNumber } from '../utils/formatters';

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'rgba(255, 255, 255, 0.97)',
    border: '1px solid rgba(22, 163, 74, 0.35)',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#14532d'
  }
};

export function SeasonalChart({ data = [], height = 250 }) {
  const chartData = MONTHS.map((name, i) => {
    const entry = data.find(d => d.month === i + 1);
    return {
      name,
      month: i + 1,
      observations: entry?.count || 0,
      fill: getSeasonColor(i + 1)
    };
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2e1a" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#166534' }} />
        <YAxis tick={{ fontSize: 11, fill: '#166534' }} />
        <Tooltip {...TOOLTIP_STYLE} formatter={(value) => [formatNumber(value), 'Observations']} />
        <Bar dataKey="observations" radius={[6, 6, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.fill} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function QualityPieChart({ data = [], height = 250 }) {
  const chartData = data.map(d => ({
    name: qualityGradeLabel(d.quality_grade),
    value: d.count,
    color: qualityGradeColor(d.quality_grade)
  }));

  if (chartData.length === 0) return <div className="flex items-center justify-center h-full text-green-700 text-sm">No data</div>;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%" cy="50%"
          innerRadius={60} outerRadius={90}
          paddingAngle={4}
          dataKey="value"
          stroke="none"
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} fillOpacity={0.85} />
          ))}
        </Pie>
        <Tooltip {...TOOLTIP_STYLE} />
        <Legend
          formatter={(value) => <span className="text-xs text-green-700">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function YearlyTrendChart({ data = [], height = 250 }) {
  if (data.length === 0) return <div className="flex items-center justify-center h-full text-green-700 text-sm">No data</div>;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="areaGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2e1a" />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#166534' }} />
        <YAxis tick={{ fontSize: 11, fill: '#166534' }} />
        <Tooltip {...TOOLTIP_STYLE} formatter={(value) => [formatNumber(value), 'Observations']} />
        <Area
          type="monotone" dataKey="count" stroke="#22c55e"
          fill="url(#areaGreen)" strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MultiSpeciesChart({ speciesStats = [], height = 300 }) {
  const sortedSpecies = [...speciesStats]
    .filter(s => s.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  const chartData = sortedSpecies.map(s => ({
    name: s.commonName?.replace(/ \(.*\)/, '').substring(0, 18),
    observations: s.total,
    color: '#22c55e'
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} layout="vertical" barCategoryGap="15%">
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2e1a" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: '#166534' }} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#166534' }} width={130} />
        <Tooltip {...TOOLTIP_STYLE} formatter={(value) => [formatNumber(value), 'Observations']} />
        <Bar dataKey="observations" fill="#22c55e" fillOpacity={0.7} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
