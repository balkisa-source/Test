import { useState } from 'react';
import { PILLARS } from '../data/sampleData.js';
import { newId } from '../lib/useStoredState.js';

const EMPTY_INSPO = { title: '', url: '', account: '', format: '', tags: '', notes: '' };
const EMPTY_COMPETITOR = { name: '', handle: '', why: '' };

const cleanHandle = (handle) => handle.trim().replace(/^@/, '');

export function Inspo({ competitors, setCompetitors, inspo, setInspo, onUseIdea }) {
  const [draft, setDraft] = useState(EMPTY_INSPO);
  const [rival, setRival] = useState(EMPTY_COMPETITOR);
  const [tag, setTag] = useState('All');
  const [account, setAccount] = useState('All');

  const tags = [...new Set(inspo.flatMap((item) => item.tags))].sort();
  const shown = inspo.filter((item) =>
    (tag === 'All' || item.tags.includes(tag)) &&
    (account === 'All' || item.account === account));

  function addInspo(event) {
    event.preventDefault();
    if (!draft.title.trim() && !draft.url.trim()) return;
    setInspo((list) => [{
      ...draft,
      id: newId('i'),
      title: draft.title.trim() || draft.url.trim(),
      account: cleanHandle(draft.account),
      tags: draft.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
    }, ...list]);
    setDraft(EMPTY_INSPO);
  }

  function addCompetitor(event) {
    event.preventDefault();
    const handle = cleanHandle(rival.handle);
    if (!handle) return;
    setCompetitors((list) => [...list, { ...rival, handle, name: rival.name || handle, id: newId('c'), formats: [] }]);
    setRival(EMPTY_COMPETITOR);
  }

  return (
    <section>
      <div className="toolbar">
        <h1>Inspo & competitors</h1>
      </div>

      <h2 className="section-title">Accounts to watch</h2>
      <p className="muted small">
        Starter picks from the self-love and wellbeing space. Open their profiles to check current numbers, and remove any that don’t fit.
      </p>
      <div className="competitors">
        {competitors.map((c) => (
          <article className="card competitor" key={c.id}>
            <div className="competitor-head">
              <div>
                <div className="plan-title">{c.name}</div>
                <a href={`https://www.tiktok.com/@${c.handle}`} target="_blank" rel="noreferrer">@{c.handle} ↗</a>
              </div>
              <button className="ghost" aria-label={`Remove ${c.name}`}
                onClick={() => setCompetitors((list) => list.filter((x) => x.id !== c.id))}>✕</button>
            </div>
            {c.why && <p className="small">{c.why}</p>}
            <div className="tags">{c.formats.map((f) => <span className="tag" key={f}>{f}</span>)}</div>
            <button className="link" onClick={() => setAccount(account === c.handle ? 'All' : c.handle)}>
              {account === c.handle ? 'Show all saved posts' : 'Show saved posts from this account'}
            </button>
          </article>
        ))}
        <form className="card competitor add-competitor" onSubmit={addCompetitor}>
          <div className="plan-title">Add an account</div>
          <input placeholder="@handle" value={rival.handle} onChange={(e) => setRival({ ...rival, handle: e.target.value })} />
          <input placeholder="Name (optional)" value={rival.name} onChange={(e) => setRival({ ...rival, name: e.target.value })} />
          <input placeholder="Why watch them?" value={rival.why} onChange={(e) => setRival({ ...rival, why: e.target.value })} />
          <button className="primary" type="submit">Add</button>
        </form>
      </div>

      <h2 className="section-title">Saved inspo</h2>
      <form className="card add-form" onSubmit={addInspo}>
        <input placeholder="Paste a TikTok link" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
        <input placeholder="What caught your eye?" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <input placeholder="@account" value={draft.account} onChange={(e) => setDraft({ ...draft, account: e.target.value })} />
        <input placeholder="Format (e.g. stitch)" value={draft.format} onChange={(e) => setDraft({ ...draft, format: e.target.value })} />
        <input placeholder="Tags, comma separated" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
        <input className="wide" placeholder="Notes: what would you borrow?" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
        <button className="primary" type="submit">Save</button>
      </form>

      <div className="filters">
        <span className="muted small">Filter:</span>
        {['All', ...tags].map((t) => (
          <button key={t} className="chip" aria-pressed={tag === t} onClick={() => setTag(t)}>{t}</button>
        ))}
        {account !== 'All' && (
          <button className="chip" aria-pressed="true" onClick={() => setAccount('All')}>@{account} ✕</button>
        )}
      </div>

      <div className="inspo-grid">
        {shown.length === 0 && <p className="muted">Nothing saved here yet.</p>}
        {shown.map((item) => (
          <article className="card inspo" key={item.id}>
            <div className="plan-title">{item.title}</div>
            <div className="muted small">
              {[item.account && `@${item.account}`, item.format].filter(Boolean).join(' · ')}
            </div>
            {item.notes && <p className="small">{item.notes}</p>}
            <div className="tags">{item.tags.map((t) => <span className="tag" key={t}>{t}</span>)}</div>
            <div className="plan-actions">
              {item.url && <a href={item.url} target="_blank" rel="noreferrer">Open ↗</a>}
              <button onClick={() => onUseIdea(item)}>Add to planner</button>
              <button className="ghost" onClick={() => setInspo((list) => list.filter((x) => x.id !== item.id))}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ideaFromInspo(item) {
  return {
    id: newId('d'),
    title: item.title,
    hook: '',
    pillar: PILLARS[0],
    date: '',
    stage: 'Idea',
    source: item.account ? `@${item.account}` : item.title,
  };
}
