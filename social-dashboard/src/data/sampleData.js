// SAMPLE DATA. Every number here is generated, not real. Replace with real
// TikTok data via src/lib/tiktok.js once the API is connected. The two
// handles are real; their content pillars and captions are placeholders.

function seeded(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY_MS = 86400000;
const DAYS = 90;

function startOfDay(d) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

// Each account has its own content pillars and captions. `lift` is how much a
// pillar tends to over- or under-perform, so the sample data has a story.
const PROFILES = [
  {
    handle: '@improudofyou.co',
    name: 'I’m Proud of You',
    seed: 20261023,
    startFollowers: 8240,
    pillars: {
      Affirmations: {
        lift: 1.35,
        captions: [
          'If nobody told you today: I’m proud of you',
          'You made it through a hard week. That counts.',
          'Read this when you feel behind',
          'Reminder: rest is not a reward, it’s a right',
          'POV: someone is finally proud of you',
        ],
      },
      Storytime: {
        lift: 1.6,
        captions: [
          'The day I stopped waiting for permission',
          'What my grandma said that changed everything',
          'I almost quit this account. Here’s why I didn’t',
          'The comment that made me cry (in a good way)',
        ],
      },
      'Community stitches': {
        lift: 1.1,
        captions: [
          'Stitching your wins from this week',
          'You asked for a sign. Here it is.',
          'Replying to the comment that said “no one is proud of me”',
          'Your small wins, read out loud',
        ],
      },
      'Self-care tips': {
        lift: 0.9,
        captions: [
          '3 tiny things to do when you feel overwhelmed',
          'A 60-second reset for anxious mornings',
          'How to talk to yourself like a friend',
        ],
      },
      'Behind the scenes': {
        lift: 0.65,
        captions: [
          'Packing your orders with love',
          'How I film these at 6am',
          'A day in the life running a kindness brand',
        ],
      },
    },
  },
  {
    handle: '@letitgo.journal',
    name: 'Let It Go Journal',
    seed: 7041991,
    startFollowers: 3120,
    pillars: {
      'Journal prompts': {
        lift: 1.5,
        captions: [
          '5 prompts for when you can’t stop overthinking',
          'Write this down before you go to sleep tonight',
          'The one question that helped me let go',
          'Journal with me: releasing what you can’t control',
        ],
      },
      'Letting go stories': {
        lift: 1.3,
        captions: [
          'I wrote a letter I’ll never send. Here’s what happened.',
          'What 30 days of journaling did to my anxiety',
          'Reading my journal from the hardest year of my life',
        ],
      },
      'Flip-throughs': {
        lift: 1.0,
        captions: [
          'Flip through my journal with me',
          'What a month of letting go looks like on paper',
          'ASMR journal flip-through',
        ],
      },
      'Healing tips': {
        lift: 0.95,
        captions: [
          'How to journal when you don’t know what to write',
          'Burn, bury or keep? A letting-go ritual',
          'Why writing it down actually works',
        ],
      },
      'Product & packing': {
        lift: 0.6,
        captions: [
          'Packing orders for the Let It Go journal',
          'What’s inside the journal (honest walkthrough)',
          'Restock day!',
        ],
      },
    },
  },
];

function generate(profile) {
  const rand = seeded(profile.seed);
  const between = (min, max) => min + rand() * (max - min);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const pillars = Object.keys(profile.pillars);
  const [top, second] = [...pillars].sort((a, b) => profile.pillars[b].lift - profile.pillars[a].lift);
  const scale = profile.startFollowers / 8000;
  const today = startOfDay(new Date());

  const posts = [];
  for (let dayIndex = 0; dayIndex < DAYS; dayIndex++) {
    // Roughly one post every two days, a little more often recently.
    const chance = 0.42 + (dayIndex / DAYS) * 0.2;
    if (rand() > chance) continue;
    const pillar = pick(pillars);
    const date = new Date(today.getTime() - (DAYS - 1 - dayIndex) * DAY_MS);
    date.setHours(Math.floor(between(7, 22)), Math.floor(between(0, 60)));
    const growth = 1 + (dayIndex / DAYS) * 0.8;
    const viral = rand() > 0.95 ? between(3, 6) : 1;
    const views = Math.round(between(3500, 14000) * scale * profile.pillars[pillar].lift * growth * viral);
    const engagement = between(0.06, 0.13) * (pillar === second ? 1.2 : 1);
    const likes = Math.round(views * engagement * 0.82);
    const comments = Math.round(views * engagement * 0.06);
    const shares = Math.round(views * engagement * 0.07 * (pillar === top ? 1.8 : 1));
    const saves = Math.round(views * engagement * 0.05 * (pillar === top ? 2.2 : 1));
    const duration = Math.round(between(9, 58));
    const completion = Math.min(0.92, between(0.22, 0.6) * (duration < 20 ? 1.4 : 1));
    posts.push({
      id: `p${dayIndex}`,
      date: date.toISOString(),
      caption: pick(profile.pillars[pillar].captions),
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
  const daily = [];
  let followers = profile.startFollowers;
  for (let dayIndex = 0; dayIndex < DAYS; dayIndex++) {
    const date = new Date(today.getTime() - (DAYS - 1 - dayIndex) * DAY_MS);
    let views = Math.round(between(600, 1400) * scale); // back-catalog views
    let gained = 0;
    for (const post of posts) {
      const age = Math.round((startOfDay(post.date) - date) / -DAY_MS);
      if (age >= 0 && age < SPREAD.length) {
        views += Math.round(post.views * SPREAD[age]);
        gained += Math.round(post.newFollowers * SPREAD[age]);
      }
    }
    const lost = Math.round(between(4, 18) * scale);
    followers += gained - lost + Math.round(between(0, 12) * scale);
    daily.push({ date: date.toISOString(), views, followers, gained, lost });
  }

  return { handle: profile.handle, name: profile.name, platform: 'TikTok', pillars, posts, daily };
}

export const accounts = PROFILES.map(generate);


// Suggested accounts to learn from in the self-love, wellbeing and journaling space.
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
  { id: 'd1', account: '@improudofyou.co', title: 'Proud-of-you Sunday: read 5 follower wins', pillar: 'Community stitches', stage: 'Idea', date: '', hook: 'You told me your wins. Here they are.' },
  { id: 'd2', account: '@improudofyou.co', title: 'Grandma’s advice, part 2', pillar: 'Storytime', stage: 'Scripted', date: '', hook: 'She said one more thing I never told you.' },
  { id: 'd3', account: '@improudofyou.co', title: '60-second anxious-morning reset', pillar: 'Self-care tips', stage: 'Filmed', date: '', hook: 'Do this before you check your phone.' },
  { id: 'd4', account: '@letitgo.journal', title: 'Unsent letter ritual, step by step', pillar: 'Journal prompts', stage: 'Idea', date: '', hook: 'Write the letter. Don’t send it. Here’s what to do next.' },
  { id: 'd5', account: '@letitgo.journal', title: 'Journal flip-through: one month of letting go', pillar: 'Flip-throughs', stage: 'Scripted', date: '', hook: 'This is what healing looks like on paper.' },
];
