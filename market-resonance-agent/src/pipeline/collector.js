import { collectFromReddit } from '../sources/reddit.js';
import { collectFromWebSearch } from '../sources/webSearch.js';
import { collectFromReviews } from '../sources/reviews.js';

const MAX_SNIPPETS = 200;

function deduplicateSnippets(snippets) {
  const seen = new Set();
  return snippets.filter(snippet => {
    // Normalize: lowercase, collapse whitespace, take first 100 chars as fingerprint
    const key = snippet.text.toLowerCase().replace(/\s+/g, ' ').trim().substring(0, 100);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function collectAllSources(query, options = {}) {
  const { sources = ['reddit', 'web', 'reviews'], verbose = false } = options;
  const log = verbose ? (msg) => process.stderr.write(`[collector] ${msg}\n`) : () => {};

  const tasks = [];

  if (sources.includes('reddit')) {
    tasks.push({
      name: 'reddit',
      fn: () => collectFromReddit(query, options),
    });
  }

  if (sources.includes('web')) {
    tasks.push({
      name: 'web',
      fn: () => collectFromWebSearch(query, options),
    });
  }

  if (sources.includes('reviews')) {
    tasks.push({
      name: 'reviews',
      fn: () => collectFromReviews(query, options),
    });
  }

  log(`Running ${tasks.length} source(s) in parallel...`);

  const results = await Promise.allSettled(tasks.map(t => t.fn()));

  const allSnippets = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      log(`${tasks[i].name}: collected ${result.value.length} snippets`);
      allSnippets.push(...result.value);
    } else {
      log(`${tasks[i].name}: FAILED - ${result.reason?.message || 'unknown error'}`);
    }
  });

  // Deduplicate and filter
  const unique = deduplicateSnippets(allSnippets);
  log(`After dedup: ${unique.length} unique snippets (from ${allSnippets.length} total)`);

  // Sort by score (higher first) and cap
  const sorted = unique
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, MAX_SNIPPETS);

  log(`Final snippet count: ${sorted.length}`);
  return sorted;
}
