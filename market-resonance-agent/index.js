#!/usr/bin/env node

import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { config, validateConfig } from './src/config.js';
import { collectAllSources } from './src/pipeline/collector.js';
import { extractPainPoints } from './src/pipeline/analyzer.js';
import { generateAdBriefs } from './src/pipeline/briefGenerator.js';
import { formatJSON, formatMarkdown } from './src/output/formatter.js';

function formatCollectOnlyMarkdown(data) {
  const lines = [
    `# Market Resonance — Data Collection Report`,
    '',
    `**Query:** ${data.meta.query}`,
    `**Brand:** ${data.meta.brandName}`,
    `**Date:** ${data.meta.timestamp}`,
    `**Sources:** ${data.meta.sourcesQueried.join(', ')}`,
    `**Snippets collected:** ${data.meta.totalSnippetsCollected}`,
    '',
    '---',
    '',
  ];

  const bySource = {};
  for (const s of data.snippets) {
    const key = s.subreddit ? `reddit (r/${s.subreddit})` : s.source;
    if (!bySource[key]) bySource[key] = [];
    bySource[key].push(s);
  }

  for (const [source, snippets] of Object.entries(bySource)) {
    lines.push(`## ${source} (${snippets.length} snippets)`);
    lines.push('');
    for (const s of snippets.slice(0, 10)) {
      lines.push(`> ${s.text.replace(/\n/g, ' ').substring(0, 200)}`);
      if (s.url) lines.push(`> *${s.url}*`);
      lines.push('');
    }
    if (snippets.length > 10) {
      lines.push(`*...and ${snippets.length - 10} more*`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

const program = new Command();

program
  .name('market-resonance')
  .description('Find customer pain points across the web and turn them into high-converting ad briefs')
  .version('1.0.0')
  .argument('<query>', 'Product, niche, or market to research (e.g., "mental health journal")')
  .option('-n, --num-briefs <n>', 'Number of ad briefs to generate', '5')
  .option('-f, --format <type>', 'Output format: json | markdown', 'markdown')
  .option('-o, --output <file>', 'Write output to file instead of stdout')
  .option('-s, --sources <list>', 'Comma-separated sources: reddit,web,reviews', 'reddit,web,reviews')
  .option('--subreddits <list>', 'Additional subreddits to search (comma-separated)')
  .option('--competitors <list>', 'Competitor product names (comma-separated)')
  .option('--brand-name <name>', 'Your brand name', "I'm Proud of You")
  .option('--brand-url <url>', 'Your brand URL', 'improudofyou.co')
  .option('--verbose', 'Print progress to stderr', false)
  .option('--collect-only', 'Only collect data, skip AI analysis (no API key needed)', false)
  .action(async (query, opts) => {
    if (!opts.collectOnly) {
      validateConfig();
    }

    const verbose = opts.verbose;
    const log = verbose ? (msg) => process.stderr.write(`\n${msg}\n`) : () => {};

    const sources = opts.sources.split(',').map(s => s.trim());
    const subreddits = opts.subreddits ? opts.subreddits.split(',').map(s => s.trim()) : [];
    const competitors = opts.competitors ? opts.competitors.split(',').map(s => s.trim()) : [];
    const numBriefs = parseInt(opts.numBriefs, 10);

    log(`🔍 Market Resonance Agent`);
    log(`   Query: "${query}"`);
    log(`   Brand: ${opts.brandName} (${opts.brandUrl})`);
    log(`   Sources: ${sources.join(', ')}`);
    log(`   Briefs to generate: ${numBriefs}`);
    log('');

    // Stage 1: Collect data
    log('━━━ Stage 1: Collecting customer feedback ━━━');
    const snippets = await collectAllSources(query, {
      sources,
      subreddits,
      competitors,
      verbose,
    });

    if (snippets.length === 0) {
      console.error('No data collected from any source. Check your network connection and try again.');
      process.exit(1);
    }

    // In collect-only mode, output raw snippets and exit
    if (opts.collectOnly) {
      const output = {
        meta: {
          query,
          brandName: opts.brandName,
          brandUrl: opts.brandUrl,
          timestamp: new Date().toISOString(),
          sourcesQueried: sources,
          totalSnippetsCollected: snippets.length,
        },
        snippets: snippets.map(s => ({
          source: s.source,
          text: s.text.substring(0, 300),
          url: s.url,
          score: s.score,
          subreddit: s.subreddit || undefined,
        })),
      };

      const formatted = opts.format === 'json'
        ? formatJSON(output)
        : formatCollectOnlyMarkdown(output);

      if (opts.output) {
        writeFileSync(opts.output, formatted, 'utf-8');
        log(`\n✅ Output written to ${opts.output}`);
      } else {
        console.log(formatted);
      }
      log(`\n✅ Collected ${snippets.length} snippets (collect-only mode, AI stages skipped)`);
      return;
    }

    // Stage 2: Extract pain points
    log('━━━ Stage 2: Extracting pain points ━━━');
    const painPoints = await extractPainPoints(snippets, query, { verbose });

    if (painPoints.length === 0) {
      console.error('No pain points could be extracted. Try a different query or broader terms.');
      process.exit(1);
    }

    // Stage 3: Generate ad briefs
    log('━━━ Stage 3: Generating ad briefs ━━━');
    const adBriefs = await generateAdBriefs(painPoints, {
      niche: query,
      brandName: opts.brandName,
      brandUrl: opts.brandUrl,
    }, {
      numBriefs,
      verbose,
    });

    // Build output
    const output = {
      meta: {
        query,
        brandName: opts.brandName,
        brandUrl: opts.brandUrl,
        timestamp: new Date().toISOString(),
        sourcesQueried: sources,
        totalSnippetsCollected: snippets.length,
      },
      painPoints,
      adBriefs,
    };

    // Format and write
    const formatted = opts.format === 'json'
      ? formatJSON(output)
      : formatMarkdown(output);

    if (opts.output) {
      writeFileSync(opts.output, formatted, 'utf-8');
      log(`\n✅ Output written to ${opts.output}`);
    } else {
      console.log(formatted);
    }

    log(`\n✅ Done! Generated ${adBriefs.length} ad briefs from ${painPoints.length} pain points.`);
  });

program.parse();
