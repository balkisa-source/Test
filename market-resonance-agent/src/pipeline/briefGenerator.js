import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { callClaudeJSON } from '../claude.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadPromptTemplate() {
  const promptPath = join(__dirname, '..', '..', 'prompts', 'adBriefGeneration.txt');
  return readFileSync(promptPath, 'utf-8');
}

async function generateBrief(painPoint, context, systemPrompt) {
  const populated = systemPrompt
    .replace('{{brandName}}', context.brandName || '')
    .replace('{{brandUrl}}', context.brandUrl || '')
    .replace('{{niche}}', context.niche)
    .replace('{{theme}}', painPoint.theme)
    .replace('{{severity}}', painPoint.severity)
    .replace('{{quotes}}', JSON.stringify(painPoint.verbatimQuotes || []));

  const userMessage = 'Generate the ad brief based on the pain point and brand context provided in the system prompt.';
  const brief = await callClaudeJSON(populated, userMessage);

  return {
    painPoint: painPoint.theme,
    severity: painPoint.severity,
    frequency: painPoint.frequency,
    verbatimQuotes: painPoint.verbatimQuotes,
    ...brief,
  };
}

export async function generateAdBriefs(painPoints, context, options = {}) {
  const { numBriefs = 5, verbose = false } = options;
  const log = verbose ? (msg) => process.stderr.write(`[briefs] ${msg}\n`) : () => {};

  const template = loadPromptTemplate();
  const topPainPoints = painPoints.slice(0, numBriefs);

  log(`Generating ${topPainPoints.length} ad briefs...`);

  const briefs = [];
  for (let i = 0; i < topPainPoints.length; i++) {
    const pp = topPainPoints[i];
    log(`Generating brief ${i + 1}/${topPainPoints.length}: "${pp.theme}"...`);
    try {
      const brief = await generateBrief(pp, context, template);
      briefs.push(brief);
      log(`Brief ${i + 1} generated successfully`);
    } catch (err) {
      log(`Brief ${i + 1} failed: ${err.message}`);
    }
  }

  log(`Successfully generated ${briefs.length} briefs`);
  return briefs;
}
