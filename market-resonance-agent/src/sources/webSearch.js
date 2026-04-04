import { config } from '../config.js';

const SEARXNG_INSTANCES = [
  'https://search.sapti.me',
  'https://searx.be',
  'https://search.bus-hit.me',
];

async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

async function searchSearXNG(query, log) {
  for (const instance of SEARXNG_INSTANCES) {
    try {
      log(`Trying SearXNG instance: ${instance}`);
      const url = `${instance}/search?q=${encodeURIComponent(query)}&format=json&categories=general&language=en`;
      const res = await fetchWithTimeout(url, {
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) continue;

      const data = await res.json();
      const results = (data.results || []).map(r => ({
        source: 'web',
        text: [r.title, r.content].filter(Boolean).join('\n').trim(),
        url: r.url || '',
        score: 0,
      })).filter(r => r.text.length >= 20);

      log(`SearXNG returned ${results.length} results`);
      return results;
    } catch (err) {
      log(`SearXNG instance ${instance} failed: ${err.message}`);
    }
  }
  return null;
}

async function searchGoogleCSE(query, log) {
  if (!config.googleCseApiKey || !config.googleCseId) return null;

  try {
    log('Trying Google Custom Search...');
    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${config.googleCseApiKey}&cx=${config.googleCseId}&num=10`;
    const res = await fetchWithTimeout(url);

    if (!res.ok) return null;

    const data = await res.json();
    const results = (data.items || []).map(item => ({
      source: 'web',
      text: [item.title, item.snippet].filter(Boolean).join('\n').trim(),
      url: item.link || '',
      score: 0,
    })).filter(r => r.text.length >= 20);

    log(`Google CSE returned ${results.length} results`);
    return results;
  } catch (err) {
    log(`Google CSE failed: ${err.message}`);
    return null;
  }
}

export async function collectFromWebSearch(query, options = {}) {
  const { verbose = false } = options;
  const log = verbose ? (msg) => process.stderr.write(`  [web] ${msg}\n`) : () => {};

  // Build search queries that target pain points
  const queries = [
    `${query} complaints problems issues`,
    `${query} review disappointed frustrating`,
    `"${query}" hate worst problem`,
  ];

  const allSnippets = [];

  for (const q of queries) {
    let results = await searchSearXNG(q, log);
    if (!results) {
      results = await searchGoogleCSE(q, log);
    }
    if (results) {
      allSnippets.push(...results);
    }
  }

  log(`Total web search snippets: ${allSnippets.length}`);
  return allSnippets;
}
