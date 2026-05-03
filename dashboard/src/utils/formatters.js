export function formatNumber(n) {
  if (n == null) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function getSeasonColor(month) {
  if ([3,4,5].includes(month)) return '#86efac';
  if ([6,7,8].includes(month)) return '#fbbf24';
  if ([9,10,11].includes(month)) return '#f97316';
  return '#93c5fd';
}

export function getSeasonName(month) {
  if ([3,4,5].includes(month)) return 'Spring';
  if ([6,7,8].includes(month)) return 'Summer';
  if ([9,10,11].includes(month)) return 'Fall';
  return 'Winter';
}

export function qualityGradeColor(grade) {
  switch (grade) {
    case 'research': return '#22c55e';
    case 'needs_id': return '#f59e0b';
    case 'casual': return '#6b7280';
    default: return '#6b7280';
  }
}

export function qualityGradeLabel(grade) {
  switch (grade) {
    case 'research': return 'Research Grade';
    case 'needs_id': return 'Needs ID';
    case 'casual': return 'Casual';
    default: return grade;
  }
}

export function timeAgo(dateStr) {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}
