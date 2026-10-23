// Data source for the dashboard. Today it returns sample data. To go live,
// swap these functions for calls to a small backend that talks to TikTok:
//
//   - Your own videos and stats: TikTok Display API (Login Kit + video.list),
//     or TikTok Business API if the account is a Business account.
//   - Competitor public videos: TikTok Research API (needs an approved
//     application), or save posts by hand on the Inspo board.
//
// TikTok tokens must stay on a server, never in this browser bundle, so the
// backend should expose something like GET /api/posts and GET /api/daily.

import { account, daily, posts } from '../data/sampleData.js';

export const isSampleData = true;

export function getAccount() {
  return account;
}

export function getPosts() {
  return posts;
}

export function getDaily() {
  return daily;
}
