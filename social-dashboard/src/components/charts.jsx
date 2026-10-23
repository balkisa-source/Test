import { useEffect, useRef, useState } from 'react';
import { compact, shortDate } from '../lib/format.js';

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

function niceMax(value) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * magnitude >= value) return step * magnitude;
  }
  return 10 * magnitude;
}

// Single-series line + area chart with a crosshair tooltip.
export function LineChart({ data, valueKey, label, height = 220, color = 'var(--series-1)', format = compact, zeroBased = true }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const pad = { top: 12, right: 16, bottom: 26, left: 44 };
  const innerW = Math.max(10, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;

  const values = data.map((d) => d[valueKey]);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const from = zeroBased ? 0 : rawMin;
  const step = niceMax((rawMax - from) / 4 || 1);
  const min = zeroBased ? 0 : Math.floor(rawMin / step) * step;
  const max = min + step * Math.max(1, Math.ceil((rawMax - min) / step));
  const x = (i) => pad.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v) => pad.top + innerH - ((v - min) / (max - min || 1)) * innerH;

  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d[valueKey])}`).join('');
  const area = `${line}L${x(data.length - 1)},${y(min)}L${x(0)},${y(min)}Z`;
  const ticks = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => min + i * step);
  const dateTicks = [0, Math.floor((data.length - 1) / 2), data.length - 1];

  function onMove(event) {
    const box = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - box.left - pad.left;
    const i = Math.round((px / innerW) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  }

  const last = data.length - 1;
  const active = hover ?? null;

  return (
    <div className="chart" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={label}
        onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={pad.left} x2={pad.left + innerW} y1={y(t)} y2={y(t)} />
            <text className="axis" x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end">{format(t)}</text>
          </g>
        ))}
        {dateTicks.map((i) => (
          <text key={i} className="axis" x={x(i)} y={height - 6}
            textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'}>
            {shortDate(data[i].date)}
          </text>
        ))}
        <path d={area} fill={color} opacity="0.1" />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(last)} cy={y(data[last][valueKey])} r="4" fill={color} stroke="var(--surface)" strokeWidth="2" />
        {active != null && (
          <g>
            <line className="crosshair" x1={x(active)} x2={x(active)} y1={pad.top} y2={pad.top + innerH} />
            <circle cx={x(active)} cy={y(data[active][valueKey])} r="5" fill={color} stroke="var(--surface)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {active != null && (
        <div className="tooltip" style={{
          left: Math.min(x(active) + 12, width - 150),
          top: Math.max(0, y(data[active][valueKey]) - 52),
        }}>
          <div className="tooltip-date">{shortDate(data[active].date)}</div>
          <div><span className="swatch" style={{ background: color }} />{label}: <strong>{format(data[active][valueKey])}</strong></div>
        </div>
      )}
    </div>
  );
}

// Horizontal bars, one hue. Items: [{ label, value, detail? }]
export function BarList({ items, format = compact, color = 'var(--series-1)', label }) {
  const max = Math.max(...items.map((item) => item.value), 0) || 1;
  return (
    <ul className="bars" aria-label={label}>
      {items.map((item) => (
        <li key={item.label} title={item.detail ?? `${item.label}: ${format(item.value)}`}>
          <span className="bar-label">{item.label}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${(item.value / max) * 100}%`, background: color }} />
          </span>
          <span className="bar-value">{format(item.value)}</span>
        </li>
      ))}
    </ul>
  );
}

// Tiny trend line for stat tiles.
export function Sparkline({ values, width = 96, height = 28 }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * width},${height - 2 - ((v - min) / (max - min || 1)) * (height - 4)}`)
    .join(' ');
  const [lx, ly] = points.split(' ').at(-1).split(',');
  return (
    <svg width={width} height={height} aria-hidden="true" className="spark">
      <polyline points={points} fill="none" stroke="var(--muted-ink)" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="3" fill="var(--series-1)" />
    </svg>
  );
}
