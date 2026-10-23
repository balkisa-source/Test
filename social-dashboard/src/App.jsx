import { useEffect, useState } from 'react';
import { suggestedCompetitors, suggestedInspo, suggestedPlan } from './data/sampleData.js';
import { getAccount, getDaily, getPosts, isSampleData } from './lib/tiktok.js';
import { useStoredState } from './lib/useStoredState.js';
import { Inspo, ideaFromInspo } from './views/Inspo.jsx';
import { Overview } from './views/Overview.jsx';
import { Planner } from './views/Planner.jsx';
import { Posts } from './views/Posts.jsx';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'posts', label: 'Posts' },
  { id: 'planner', label: 'Planner' },
  { id: 'inspo', label: 'Inspo' },
];

function currentTab() {
  const hash = window.location.hash.slice(1);
  return TABS.some((t) => t.id === hash) ? hash : 'overview';
}

export default function App() {
  const [tab, setTab] = useState(currentTab);
  const [plan, setPlan] = useStoredState('ipoy.plan', suggestedPlan);
  const [competitors, setCompetitors] = useStoredState('ipoy.competitors', suggestedCompetitors);
  const [inspo, setInspo] = useStoredState('ipoy.inspo', suggestedInspo);

  useEffect(() => {
    const onHash = () => setTab(currentTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const account = getAccount();
  const daily = getDaily();
  const posts = getPosts();

  function addIdeaFromInspo(item) {
    setPlan((list) => [...list, ideaFromInspo(item)]);
    window.location.hash = 'planner';
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">♥</span>
          <div>
            <div className="brand-name">I’m Proud of You</div>
            <div className="muted small">{account.platform} · {account.handle}</div>
          </div>
        </div>
        <nav>
          {TABS.map((t) => (
            <a key={t.id} href={`#${t.id}`} aria-current={tab === t.id ? 'page' : undefined}>{t.label}</a>
          ))}
        </nav>
      </header>

      {isSampleData && (tab === 'overview' || tab === 'posts') && (
        <div className="banner">
          Showing <strong>sample data</strong>. Connect TikTok in <code>src/lib/tiktok.js</code> to see your real numbers.
        </div>
      )}

      <main>
        {tab === 'overview' && <Overview daily={daily} posts={posts} />}
        {tab === 'posts' && <Posts posts={posts} />}
        {tab === 'planner' && <Planner plan={plan} setPlan={setPlan} />}
        {tab === 'inspo' && (
          <Inspo competitors={competitors} setCompetitors={setCompetitors}
            inspo={inspo} setInspo={setInspo} onUseIdea={addIdeaFromInspo} />
        )}
      </main>
    </div>
  );
}
