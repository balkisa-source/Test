// SAMPLE DATA. Every number here is generated, not real. Replace with real
// TikTok data via src/lib/tiktok.js once the API is connected.

function seeded(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = seeded(20261023);
const between = (min, max) => min + rand() * (max - min);
const pick = (list) => list[Math.floor(rand() * list.length)];

export const PILLARS = [
  'Affirmations',
  'Storytime',
  'Community stitches',
  'Self-care tips',
  'Behind the scenes',
];

// How much each pillar tends to over- or under-perform, so the sample data
// tells a story worth reading.
const PILLAR_LIFT = {
  Affirmations: 1.35,
  Storytime: 1.6,
  'Community stitches': 1.1,
  'Self-care tips': 0.9,
  'Behind the scenes': 0.65,
};

const CAPTIONS = {
  Affirmations: [
    'If nobody told you today: I’m proud of you',
    'You made it through a hard week. That counts.',
    'Read this when you feel behind',
    'Reminder: rest is not a reward, it’s a right',
    'POV: someone is finally proud of you',
  ],
  Storytime: [
    'The day I stopped waiting for permission',
    'What my grandma said that changed everything',
    'I almost quit this account. Here’s why I didn’t',
    'The comment that made me cry (in a good way)',
  ],
  'Community stitches': [
    'Stitching your wins from this week',
    'You asked for a sign. Here it is.',
    'Replying to the comment that said “no one is proud of me”',
    'Your small wins, read out loud',
  ],
  'Self-care tips': [
    '3 tiny things to do when you feel overwhelmed',
    'A 60-second reset for anxious mornings',
    'Journaling prompts for when you feel stuck',
    'How to talk to yourself like a friend',
  ],
  'Behind the scenes': [
    'Packing your orders with love',
    'How I film these at 6am',
    'A day in the life running a kindness brand',
  ],
};

const DAY_MS = 86400000;
const DAYS = 90;

function startOfDay(d) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

const today = startOfDay(new Date());

export const posts = [];
for (let dayIndex = 0; dayIndex < DAYS; dayIndex++) {
  // Roughly one post every two days, a little more often recently.
  const chance = 0.42 + (dayIndex / DAYS) * 0.2;
  if (rand() > chance) continue;
  const pillar = pick(PILLARS);
  const date = new Date(today.getTime() - (DAYS - 1 - dayIndex) * DAY_MS);
  date.setHours(Math.floor(between(7, 22)), Math.floor(between(0, 60)));
  const growth = 1 + (dayIndex / DAYS) * 0.8;
  const viral = rand() > 0.93 ? between(4, 9) : 1;
  const views = Math.round(between(3500, 14000) * PILLAR_LIFT[pillar] * growth * viral);
  const engagement = between(0.06, 0.13) * (pillar === 'Storytime' ? 1.2 : 1);
  const likes = Math.round(views * engagement * 0.82);
  const comments = Math.round(views * engagement * 0.06);
  const shares = Math.round(views * engagement * 0.07 * (pillar === 'Affirmations' ? 1.8 : 1));
  const saves = Math.round(views * engagement * 0.05 * (pillar === 'Self-care tips' ? 2.2 : 1));
  const duration = Math.round(between(9, 58));
  const completion = Math.min(0.92, between(0.22, 0.6) * (duration < 20 ? 1.4 : 1));
  posts.push({
    id: `p${dayIndex}`,
    date: date.toISOString(),
    caption: pick(CAPTIONS[pillar]),
    pillar,
    views,
    likes,
    comments,
    shares,
    saves,
    duration,
    avgWatch: Math.round(duration * completion * 10) / 10,
    completion,
    newFollowers: Math.round(views * between(0.002, 0.006)),
  });
}

// Daily account totals. Each post keeps earning views for a few days.
const SPREAD = [0.55, 0.25, 0.12, 0.08];
export const daily = [];
let followers = 8240;
for (let dayIndex = 0; dayIndex < DAYS; dayIndex++) {
  const date = new Date(today.getTime() - (DAYS - 1 - dayIndex) * DAY_MS);
  let views = Math.round(between(600, 1400)); // back-catalog views
  let gained = 0;
  for (const post of posts) {
    const age = Math.round((startOfDay(post.date) - date) / -DAY_MS);
    if (age >= 0 && age < SPREAD.length) {
      views += Math.round(post.views * SPREAD[age]);
      gained += Math.round(post.newFollowers * SPREAD[age]);
    }
  }
  const lost = Math.round(between(4, 18));
  followers += gained - lost + Math.round(between(0, 12));
  daily.push({ date: date.toISOString(), views, followers, gained, lost });
}

export const account = {
  handle: '@improudofyou',
  platform: 'TikTok',
};

// Suggested accounts to learn from in the self-love / wellbeing space.
// No follower counts on purpose: check the live profiles rather than trust
// numbers that go stale.
export const suggestedCompetitors = [
  {
    id: 'c1',
    name: 'Mel Robbins',
    handle: 'melrobbins',
    why: 'Direct-to-camera motivation with a strong first-second hook. Study her openers.',
    formats: ['Talking head', 'Podcast clips'],
  },
  {
    id: 'c2',
    name: 'Jay Shetty',
    handle: 'jayshetty',
    why: 'Storytelling with voiceover and a twist at the end. Closest match to your Storytime pillar.',
    formats: ['Voiceover story', 'Quote'],
  },
  {
    id: 'c3',
    name: 'Dr Julie Smith',
    handle: 'drjuliesmith',
    why: 'Short, practical psychology explainers. Good model for your Self-care tips pillar.',
    formats: ['Explainer', 'Text on screen'],
  },
  {
    id: 'c4',
    name: 'Morgan Harper Nichols',
    handle: 'morganharpernichols',
    why: 'Gentle poetry and art, closest to your brand’s tone. Watch how she pairs words with visuals.',
    formats: ['Poetry', 'Art process'],
  },
  {
    id: 'c5',
    name: 'The Holistic Psychologist',
    handle: 'the.holistic.psychologist',
    why: 'Reflective text-on-screen prompts that get lots of saves and shares.',
    formats: ['Text on screen', 'Carousel'],
  },
];

export const suggestedInspo = [
  {
    id: 'i1',
    title: '“If nobody told you today…” opener',
    account: '',
    url: '',
    format: 'Talking head',
    tags: ['hook', 'affirmation'],
    notes: 'Open on a close-up with the line in the first second, then pause. Pausing makes people stay.',
  },
  {
    id: 'i2',
    title: 'Reply-to-comment stitch',
    account: '',
    url: '',
    format: 'Stitch',
    tags: ['community', 'series'],
    notes: 'Pick one vulnerable comment a week and answer it on camera. Turns followers into a community.',
  },
  {
    id: 'i3',
    title: '“Read this when…” text-on-screen',
    account: 'the.holistic.psychologist',
    url: '',
    format: 'Text on screen',
    tags: ['saves', 'affirmation'],
    notes: 'Slow text reveal over calm B-roll. Built to be saved and rewatched, which pushes reach.',
  },
  {
    id: 'i4',
    title: 'Story with the twist at the end',
    account: 'jayshetty',
    url: '',
    format: 'Voiceover story',
    tags: ['storytime', 'retention'],
    notes: 'Hold the lesson until the last 3 seconds so people watch to the end.',
  },
];

export const suggestedPlan = [
  { id: 'd1', title: 'Proud-of-you Sunday: read 5 follower wins', pillar: 'Community stitches', stage: 'Idea', date: '', hook: 'You told me your wins. Here they are.' },
  { id: 'd2', title: 'Grandma’s advice, part 2', pillar: 'Storytime', stage: 'Scripted', date: '', hook: 'She said one more thing I never told you.' },
  { id: 'd3', title: '60-second anxious-morning reset', pillar: 'Self-care tips', stage: 'Filmed', date: '', hook: 'Do this before you check your phone.' },
];
