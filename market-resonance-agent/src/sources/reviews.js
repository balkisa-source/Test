import * as cheerio from 'cheerio';

async function fetchPage(url, log) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (err) {
    log(`Fetch failed for ${url}: ${err.message}`);
    return null;
  }
}

async function scrapeTrustpilot(domain, log) {
  const url = `https://www.trustpilot.com/review/${domain}`;
  log(`Scraping Trustpilot: ${url}`);

  const html = await fetchPage(url, log);
  if (!html) return [];

  const $ = cheerio.load(html);
  const snippets = [];

  // Trustpilot uses data attributes and various selectors for review text
  $('[data-review-content], .review-content__text, p[data-service-review-text-typography]').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length >= 20) {
      snippets.push({
        source: 'review',
        text: text.substring(0, 1000),
        url,
        score: 0,
      });
    }
  });

  log(`Trustpilot: found ${snippets.length} reviews`);
  return snippets;
}

async function scrapeAmazonSearch(query, log) {
  // Search Amazon for the product category and look for review snippets
  const url = `https://www.amazon.com/s?k=${encodeURIComponent(query)}&i=stripbooks`;
  log(`Searching Amazon: ${url}`);

  const html = await fetchPage(url, log);
  if (!html) return [];

  const $ = cheerio.load(html);
  const snippets = [];

  // Extract product titles and review snippets from search results
  $('.a-section .a-text-normal, .a-row .a-size-base').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length >= 30 && text.length <= 1000) {
      snippets.push({
        source: 'review',
        text,
        url: 'https://www.amazon.com',
        score: 0,
      });
    }
  });

  log(`Amazon search: found ${snippets.length} snippets`);
  return snippets;
}

export async function collectFromReviews(query, options = {}) {
  const { competitors = [], verbose = false } = options;
  const log = verbose ? (msg) => process.stderr.write(`  [reviews] ${msg}\n`) : () => {};
  const allSnippets = [];

  // Scrape Trustpilot for competitors if provided
  for (const competitor of competitors) {
    try {
      // Convert competitor name to likely domain format
      const domain = competitor.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') + '.com';
      const results = await scrapeTrustpilot(domain, log);
      allSnippets.push(...results);
    } catch (err) {
      log(`Trustpilot scrape failed for ${competitor}: ${err.message}`);
    }
  }

  // Amazon search for product category
  try {
    const results = await scrapeAmazonSearch(query, log);
    allSnippets.push(...results);
  } catch (err) {
    log(`Amazon search failed: ${err.message}`);
  }

  log(`Total review snippets: ${allSnippets.length}`);
  return allSnippets;
}
