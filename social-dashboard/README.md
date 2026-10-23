# I'm Proud of You · Social dashboard

A TikTok dashboard for managing content, tracking analytics and collecting inspo from competitors.

```bash
cd social-dashboard
npm install
npm run dev      # http://localhost:5173
```

## What's inside

| Tab | What it does |
|---|---|
| **Account switcher** | Top-left dropdown flips between @improudofyou.co and @letitgo.journal. Analytics and the planner follow the selected account; competitors and inspo are shared. |
| **Overview** | Followers, views, new followers, engagement rate and post count for 7 / 28 / 90 days, each compared with the previous period. Daily views and follower charts, average views by content pillar, top posts. |
| **Posts** | Sortable table of every post, filterable by pillar. Shows which pillars get the most shares and saves, and how video length affects watch-through. |
| **Planner** | Board for video ideas: Idea → Scripted → Filmed → Scheduled → Posted, with hook, pillar and planned date. |
| **Inspo** | Accounts to watch (links to their TikTok profiles) and a board of saved posts with notes and tags. "Add to planner" turns a saved post into a video idea. |

Planner, competitors and inspo are saved in your browser (localStorage), so they're per device for now.

## Sample data

The analytics are **generated sample data** (`src/data/sampleData.js`). The handles are real; the content pillars and captions for each account are placeholders, so edit them in that file to match what you actually post. The suggested competitors are real accounts in the self-love and wellbeing space, but they're only starting points, so swap them for your actual competitors.

## Connecting real TikTok data

All data comes through `src/lib/tiktok.js`. To go live:

1. Create an app at [developers.tiktok.com](https://developers.tiktok.com) and enable **Login Kit** + **Display API** (`user.info.stats`, `video.list` scopes). For a Business account, the **TikTok Business API** returns richer analytics (watch time, traffic sources).
2. Add a small backend (for example a serverless function) that handles the OAuth login and keeps the access token server-side. Never put TikTok tokens in this frontend.
3. Have it return posts and daily totals in the same shape as `sampleData.js`, and change `getPosts()` / `getDaily()` to fetch from it.

Competitor videos need the **TikTok Research API** (application required). Until then, save posts by hand on the Inspo board.
