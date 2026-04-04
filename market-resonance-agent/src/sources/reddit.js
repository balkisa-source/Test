import { config } from '../config.js';

const RATE_LIMIT_MS = 2000;
const DEFAULT_SUBREDDITS = [
  'journaling', 'mentalhealth', 'selfimprovement', 'anxiety',
  'depression', 'therapy', 'mindfulness', 'wellness',
];

let lastRequestTime = 0;

async function rateLimitedFetch(url) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();

  const res = await fetch(url, {
    headers: { 'User-Agent': config.redditUserAgent },
  });

  if (!res.ok) {
    throw new Error(`Reddit API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function extractSnippets(data) {
  const snippets = [];
  const children = data?.data?.children || [];

  for (const child of children) {
    const post = child.data;
    if (!post) continue;

    // Post title + selftext
    const text = [post.title, post.selftext].filter(Boolean).join('\n').trim();
    if (text.length >= 20) {
      snippets.push({
        source: 'reddit',
        text: text.substring(0, 2000),
        url: `https://reddit.com${post.permalink || ''}`,
        score: post.score || 0,
        subreddit: post.subreddit || '',
      });
    }
  }

  return snippets;
}

async function searchSubreddit(subreddit, query, limit = 25) {
  const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=on&sort=relevance&limit=${limit}`;
  const data = await rateLimitedFetch(url);
  return extractSnippets(data);
}

async function searchGlobal(query, limit = 50) {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=relevance&limit=${limit}`;
  const data = await rateLimitedFetch(url);
  return extractSnippets(data);
}

async function fetchComments(postId, limit = 10) {
  const url = `https://www.reddit.com/comments/${postId}.json?limit=${limit}`;
  const data = await rateLimitedFetch(url);

  const snippets = [];
  // Comments are in the second element of the response array
  const commentData = data?.[1]?.data?.children || [];

  for (const child of commentData) {
    const comment = child.data;
    if (!comment?.body || comment.body.length < 20) continue;

    snippets.push({
      source: 'reddit',
      text: comment.body.substring(0, 1000),
      url: `https://reddit.com${comment.permalink || ''}`,
      score: comment.score || 0,
      subreddit: comment.subreddit || '',
    });
  }

  return snippets;
}

export async function collectFromReddit(query, options = {}) {
  const { subreddits = [], verbose = false } = options;
  const allSubreddits = [...new Set([...DEFAULT_SUBREDDITS, ...subreddits])];
  const allSnippets = [];
  const log = verbose ? (msg) => process.stderr.write(`  [reddit] ${msg}\n`) : () => {};

  // Global search
  try {
    log(`Searching globally for "${query}"...`);
    const globalResults = await searchGlobal(query);
    allSnippets.push(...globalResults);
    log(`Found ${globalResults.length} global results`);
  } catch (err) {
    log(`Global search failed: ${err.message}`);
  }

  // Search targeted subreddits
  for (const sub of allSubreddits) {
    try {
      log(`Searching r/${sub}...`);
      const results = await searchSubreddit(sub, query);
      allSnippets.push(...results);
      log(`Found ${results.length} results in r/${sub}`);
    } catch (err) {
      log(`r/${sub} search failed: ${err.message}`);
    }
  }

  // Fetch comments from top posts
  const topPosts = allSnippets
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  for (const post of topPosts) {
    const postIdMatch = post.url.match(/comments\/(\w+)/);
    if (!postIdMatch) continue;
    try {
      log(`Fetching comments for post ${postIdMatch[1]}...`);
      const comments = await fetchComments(postIdMatch[1]);
      allSnippets.push(...comments);
    } catch (err) {
      log(`Comment fetch failed: ${err.message}`);
    }
  }

  log(`Total Reddit snippets: ${allSnippets.length}`);
  return allSnippets;
}
