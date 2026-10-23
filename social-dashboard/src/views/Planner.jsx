import { useState } from 'react';
import { PILLARS } from '../data/sampleData.js';
import { newId } from '../lib/useStoredState.js';

export const STAGES = ['Idea', 'Scripted', 'Filmed', 'Scheduled', 'Posted'];

const EMPTY = { title: '', hook: '', pillar: PILLARS[0], date: '' };

export function Planner({ plan, setPlan }) {
  const [draft, setDraft] = useState(EMPTY);

  function add(event) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setPlan((list) => [...list, { ...draft, id: newId('d'), stage: 'Idea' }]);
    setDraft(EMPTY);
  }

  function move(id, step) {
    setPlan((list) => list.map((item) => {
      if (item.id !== id) return item;
      const index = Math.max(0, Math.min(STAGES.length - 1, STAGES.indexOf(item.stage) + step));
      return { ...item, stage: STAGES[index] };
    }));
  }

  function update(id, patch) {
    setPlan((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function remove(id) {
    setPlan((list) => list.filter((item) => item.id !== id));
  }

  return (
    <section>
      <div className="toolbar">
        <h1>Content planner</h1>
      </div>

      <form className="card add-form" onSubmit={add}>
        <input placeholder="Video idea" value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <input placeholder="Hook (the first line on screen)" value={draft.hook}
          onChange={(e) => setDraft({ ...draft, hook: e.target.value })} />
        <select value={draft.pillar} onChange={(e) => setDraft({ ...draft, pillar: e.target.value })}>
          {PILLARS.map((p) => <option key={p}>{p}</option>)}
        </select>
        <input type="date" value={draft.date} aria-label="Planned date"
          onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        <button className="primary" type="submit">Add idea</button>
      </form>

      <div className="board">
        {STAGES.map((stage, stageIndex) => {
          const items = plan
            .filter((item) => item.stage === stage)
            .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
          return (
            <div className="column" key={stage}>
              <h2>{stage} <span className="count">{items.length}</span></h2>
              {items.map((item) => (
                <article className="card plan-card" key={item.id}>
                  <div className="plan-title">{item.title}</div>
                  {item.hook && <div className="plan-hook">“{item.hook}”</div>}
                  <div className="plan-meta">
                    <span className="tag">{item.pillar}</span>
                    <input type="date" value={item.date} aria-label="Planned date"
                      onChange={(e) => update(item.id, { date: e.target.value })} />
                  </div>
                  {item.source && <div className="muted small">Inspired by: {item.source}</div>}
                  <div className="plan-actions">
                    <button disabled={stageIndex === 0} onClick={() => move(item.id, -1)} aria-label="Move back">←</button>
                    <button disabled={stageIndex === STAGES.length - 1} onClick={() => move(item.id, 1)} aria-label="Move forward">→</button>
                    <button className="ghost" onClick={() => remove(item.id)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
