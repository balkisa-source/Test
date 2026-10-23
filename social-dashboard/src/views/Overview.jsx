import { useMemo, useState } from 'react';
import { BarList, LineChart } from '../components/charts.jsx';
import { StatTile } from '../components/StatTile.jsx';
import { compact, engagementRate, pct, shortDate, sum } from '../lib/format.js';

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 28, label: '28 days' },
  { days: 90, label: '90 days' },
];

function inWindow(list, from, to) {
  return list.filter((item) => {
    const t = new Date(item.date).getTime();
    return t >= from && t < to;
  });
}

export function Overview({ daily, posts, pillars }) {
  const [days, setDays] = useState(28);

  const stats = useMemo(() => {
    const end = new Date(daily.at(-1).date).getTime() + 86400000;
    const start = end - days * 86400000;
    const prevStart = start - days * 86400000;
    const current = inWindow(daily, start, end);
    const previous = inWindow(daily, prevStart, start);
    const currentPosts = inWindow(posts, start, end);
    const previousPosts = inWindow(posts, prevStart, start);

    const change = (a, b) => (b ? (a - b) / b : null);
    const views = sum(current, 'views');
    const prevViews = sum(previous, 'views');
    const gained = current.at(-1).followers - (previous.at(-1)?.followers ?? current[0].followers);
    const prevGained = previous.length > 1 ? previous.at(-1).followers - previous[0].followers : null;
    const er = currentPosts.length ? sum(currentPosts.map((p) => ({ v: engagementRate(p) })), 'v') / currentPosts.length : 0;
    const prevEr = previousPosts.length ? sum(previousPosts.map((p) => ({ v: engagementRate(p) })), 'v') / previousPosts.length : null;

    const byPillar = pillars.map((pillar) => {
      const list = currentPosts.filter((p) => p.pillar === pillar);
      return {
        label: pillar,
        value: list.length ? sum(list, 'views') / list.length : 0,
        detail: `${pillar}: ${list.length} posts, avg ${compact(list.length ? sum(list, 'views') / list.length : 0)} views`,
      };
    }).sort((a, b) => b.value - a.value);

    const top = [...currentPosts].sort((a, b) => b.views - a.views).slice(0, 5);

    return {
      current, views, gained, er, byPillar, top,
      postCount: currentPosts.length,
      followers: current.at(-1).followers,
      viewsDelta: change(views, prevViews),
      gainedDelta: prevGained == null ? null : change(gained, prevGained),
      erDelta: prevEr == null ? null : change(er, prevEr),
      postDelta: previous.length ? change(currentPosts.length, previousPosts.length) : null,
    };
  }, [daily, posts, pillars, days]);

  const bestPillar = stats.byPillar[0];

  return (
    <section>
      <div className="toolbar">
        <h1>Overview</h1>
        <div className="segmented" role="group" aria-label="Date range">
          {RANGES.map((range) => (
            <button key={range.days} aria-pressed={days === range.days} onClick={() => setDays(range.days)}>
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="stats">
        <StatTile hero label="Followers" value={compact(stats.followers)}
          trend={stats.current.map((d) => d.followers)} />
        <StatTile label="Video views" value={compact(stats.views)} delta={stats.viewsDelta}
          trend={stats.current.map((d) => d.views)} />
        <StatTile label="New followers" value={compact(stats.gained)} delta={stats.gainedDelta} />
        <StatTile label="Engagement rate" value={pct(stats.er)} delta={stats.erDelta} />
        <StatTile label="Posts" value={stats.postCount} delta={stats.postDelta} />
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>Daily video views</h2>
          <LineChart data={stats.current} valueKey="views" label="Views" />
        </div>
        <div className="card">
          <h2>Followers</h2>
          <LineChart data={stats.current} valueKey="followers" label="Followers" zeroBased={false} />
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>Average views per post, by content pillar</h2>
          {bestPillar?.value > 0 && (
            <p className="insight">
              <strong>{bestPillar.label}</strong> is your strongest pillar right now. Post more of it.
            </p>
          )}
          <BarList items={stats.byPillar} label="Average views by pillar" />
        </div>
        <div className="card">
          <h2>Top posts</h2>
          {stats.top.length === 0 && <p className="muted">No posts in this period.</p>}
          <ol className="top-posts">
            {stats.top.map((post) => (
              <li key={post.id}>
                <div>
                  <div className="post-caption">{post.caption}</div>
                  <div className="muted small">{shortDate(post.date)} · {post.pillar}</div>
                </div>
                <div className="post-metric">
                  <strong>{compact(post.views)}</strong>
                  <span className="muted small">{pct(engagementRate(post))} eng.</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
