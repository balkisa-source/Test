import { useMemo, useState } from 'react';
import { BarList } from '../components/charts.jsx';
import { compact, engagementRate, pct, shortDate } from '../lib/format.js';

const COLUMNS = [
  { key: 'date', label: 'Posted', value: (p) => new Date(p.date).getTime(), render: (p) => shortDate(p.date) },
  { key: 'views', label: 'Views', value: (p) => p.views, render: (p) => compact(p.views) },
  { key: 'er', label: 'Engagement', value: engagementRate, render: (p) => pct(engagementRate(p)) },
  { key: 'likes', label: 'Likes', value: (p) => p.likes, render: (p) => compact(p.likes) },
  { key: 'comments', label: 'Comments', value: (p) => p.comments, render: (p) => compact(p.comments) },
  { key: 'shares', label: 'Shares', value: (p) => p.shares, render: (p) => compact(p.shares) },
  { key: 'saves', label: 'Saves', value: (p) => p.saves, render: (p) => compact(p.saves) },
  { key: 'completion', label: 'Watched to end', value: (p) => p.completion, render: (p) => pct(p.completion, 0) },
];

export function Posts({ posts, pillars }) {
  const [pillar, setPillar] = useState('All');
  const activePillar = pillars.includes(pillar) ? pillar : 'All';
  const [sort, setSort] = useState({ key: 'date', dir: -1 });

  const filtered = useMemo(() => {
    const column = COLUMNS.find((c) => c.key === sort.key);
    return posts
      .filter((p) => activePillar === 'All' || p.pillar === activePillar)
      .sort((a, b) => (column.value(a) - column.value(b)) * sort.dir);
  }, [posts, activePillar, sort]);

  const shareRate = pillars.map((name) => {
    const list = posts.filter((p) => p.pillar === name);
    const views = list.reduce((t, p) => t + p.views, 0);
    const shares = list.reduce((t, p) => t + p.shares + p.saves, 0);
    return { label: name, value: views ? shares / views : 0 };
  }).sort((a, b) => b.value - a.value);

  const length = [
    { label: 'Under 15s', test: (p) => p.duration < 15 },
    { label: '15–30s', test: (p) => p.duration >= 15 && p.duration < 30 },
    { label: '30–45s', test: (p) => p.duration >= 30 && p.duration < 45 },
    { label: '45s+', test: (p) => p.duration >= 45 },
  ].map(({ label, test }) => {
    const list = posts.filter(test);
    return { label, value: list.length ? list.reduce((t, p) => t + p.completion, 0) / list.length : 0 };
  });

  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: -1 }));
  }

  return (
    <section>
      <div className="toolbar">
        <h1>Posts</h1>
        <label className="select">
          Pillar
          <select value={activePillar} onChange={(e) => setPillar(e.target.value)}>
            <option>All</option>
            {pillars.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>Shares + saves per view, by pillar</h2>
          <p className="muted small">Shares and saves are the strongest signals that a video will be pushed to more people.</p>
          <BarList items={shareRate} format={(v) => pct(v)} label="Share and save rate by pillar" />
        </div>
        <div className="card">
          <h2>Watched to the end, by video length</h2>
          <p className="muted small">Average share of each video that viewers watched.</p>
          <BarList items={length} format={(v) => pct(v, 0)} label="Completion by video length" />
        </div>
      </div>

      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>Post</th>
              {COLUMNS.map((c) => (
                <th key={c.key} className="num">
                  <button className="sort" onClick={() => toggleSort(c.key)}>
                    {c.label}{sort.key === c.key ? (sort.dir < 0 ? ' ↓' : ' ↑') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((post) => (
              <tr key={post.id}>
                <td>
                  <div className="post-caption">{post.caption}</div>
                  <div className="muted small">{post.pillar} · {post.duration}s</div>
                </td>
                {COLUMNS.map((c) => <td key={c.key} className="num">{c.render(post)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
