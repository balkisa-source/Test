import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  googleCseApiKey: process.env.GOOGLE_CSE_API_KEY || '',
  googleCseId: process.env.GOOGLE_CSE_ID || '',
  redditUserAgent: process.env.REDDIT_USER_AGENT || 'MarketResonanceAgent/1.0',
  model: 'claude-sonnet-4-20250514',
  maxTokens: 4096,
};

export function validateConfig() {
  if (!config.anthropicApiKey) {
    console.error('Error: ANTHROPIC_API_KEY is required. Copy .env.example to .env and add your key.');
    process.exit(1);
  }
}
