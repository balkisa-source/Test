import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { callClaudeJSON } from '../claude.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BATCH_SIZE = 40;

function loadPromptTemplate() {
  const promptPath = join(__dirname, '..', '..', 'prompts', 'painPointExtraction.txt');
  return readFileSync(promptPath, 'utf-8');
}

function batchSnippets(snippets, batchSize) {
  const batches = [];
  for (let i = 0; i < snippets.length; i += batchSize) {
    batches.push(snippets.slice(i, i + batchSize));
  }
  return batches;
}

function formatSnippetsForPrompt(snippets) {
  return snippets.map((s, i) => {
    return `[${i + 1}] (${s.source}${s.subreddit ? ` r/${s.subreddit}` : ''}) ${s.text}`;
  }).join('\n\n');
}

async function analyzeBatch(batch, niche, systemPrompt) {
  const userMessage = `Customer feedback snippets:\n---\n${formatSnippetsForPrompt(batch)}`;
  const result = await callClaudeJSON(systemPrompt, userMessage);
  return result.painPoints || [];
}

async function consolidatePainPoints(batchResults, niche) {
  const systemPrompt = `You are merging multiple pain point analyses into a single deduplicated list. Combine similar themes. Recalculate frequency as a sum. Keep the strongest verbatim quotes (max 3 per pain point). Rank by severity (critical > major > minor) then frequency (highest first). Maximum 15 pain points.

Respond ONLY with valid JSON:
{
  "painPoints": [
    {
      "theme": "...",
      "severity": "critical|major|minor",
      "frequency": 0,
      "verbatimQuotes": ["...", "..."],
      "sources": ["reddit", "review"]
    }
  ]
}`;

  const userMessage = `Input analyses to merge:\n${JSON.stringify(batchResults, null, 2)}`;
  const result = await callClaudeJSON(systemPrompt, userMessage);
  return result.painPoints || [];
}

export async function extractPainPoints(snippets, niche, options = {}) {
  const { verbose = false } = options;
  const log = verbose ? (msg) => process.stderr.write(`[analyzer] ${msg}\n`) : () => {};

  const template = loadPromptTemplate();
  const systemPrompt = template.replace('{{niche}}', niche);

  const batches = batchSnippets(snippets, BATCH_SIZE);
  log(`Analyzing ${snippets.length} snippets in ${batches.length} batch(es)...`);

  // Process batches (sequentially to respect rate limits)
  const allPainPoints = [];
  for (let i = 0; i < batches.length; i++) {
    log(`Processing batch ${i + 1}/${batches.length}...`);
    try {
      const batchPainPoints = await analyzeBatch(batches[i], niche, systemPrompt);
      allPainPoints.push(...batchPainPoints);
      log(`Batch ${i + 1}: found ${batchPainPoints.length} pain points`);
    } catch (err) {
      log(`Batch ${i + 1} failed: ${err.message}`);
    }
  }

  if (allPainPoints.length === 0) {
    log('No pain points extracted from any batch');
    return [];
  }

  // Consolidate if multiple batches
  if (batches.length > 1) {
    log('Consolidating pain points across batches...');
    const consolidated = await consolidatePainPoints(allPainPoints, niche);
    log(`Consolidated to ${consolidated.length} pain points`);
    return consolidated;
  }

  return allPainPoints;
}
