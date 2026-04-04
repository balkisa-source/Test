#!/usr/bin/env node

import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { config, validateConfig } from './src/config.js';
import { collectAllSources } from './src/pipeline/collector.js';
import { extractPainPoints } from './src/pipeline/analyzer.js';
import { generateAdBriefs } from './src/pipeline/briefGenerator.js';
import { formatJSON, formatMarkdown } from './src/output/formatter.js';

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
  .action(async (query, opts) => {
    validateConfig();

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
