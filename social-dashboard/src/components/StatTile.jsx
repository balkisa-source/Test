import { signedPct } from '../lib/format.js';
import { Sparkline } from './charts.jsx';

export function StatTile({ label, value, delta, trend, hero = false }) {
  const direction = delta == null ? null : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  return (
    <div className={`card stat ${hero ? 'stat-hero' : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-foot">
        {direction && (
          <span className={`delta delta-${direction}`}>
            {direction === 'up' ? '▲' : direction === 'down' ? '▼' : '•'} {signedPct(delta)}
            <span className="muted"> vs previous period</span>
          </span>
        )}
        {trend && <Sparkline values={trend} />}
      </div>
    </div>
  );
}
