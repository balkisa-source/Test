export function compact(n) {
  if (n == null || Number.isNaN(n)) return '–';
  const abs = Math.abs(n);
  const trim = (v, digits) => v.toFixed(digits).replace(/\.0$/, '');
  if (abs >= 1e6) return `${trim(n / 1e6, abs >= 1e8 ? 0 : 1)}M`;
  if (abs >= 1e3) return `${trim(n / 1e3, abs >= 1e5 ? 0 : 1)}K`;
  return Math.round(n).toLocaleString();
}

export function pct(n, digits = 1) {
  return `${(n * 100).toFixed(digits)}%`;
}

export function signedPct(n) {
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';
  return `${sign}${Math.abs(n * 100).toFixed(1)}%`;
}

export function shortDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function engagementRate(post) {
  return (post.likes + post.comments + post.shares + post.saves) / post.views;
}

export function sum(list, key) {
  return list.reduce((total, item) => total + item[key], 0);
}
