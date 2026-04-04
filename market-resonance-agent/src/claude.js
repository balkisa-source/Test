import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';

let client = null;

function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: config.anthropicApiKey });
  }
  return client;
}

export async function callClaude(systemPrompt, userMessage, retries = 2) {
  const anthropic = getClient();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const message = await anthropic.messages.create({
        model: config.model,
        max_tokens: config.maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      const text = message.content[0].text;
      return text;
    } catch (err) {
      if (attempt < retries && (err.status === 429 || err.status >= 500)) {
        const delay = Math.pow(2, attempt + 1) * 1000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

export async function callClaudeJSON(systemPrompt, userMessage, retries = 2) {
  const text = await callClaude(systemPrompt, userMessage, retries);
  return parseJSONResponse(text);
}

function parseJSONResponse(text) {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Strip markdown code fences
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      try {
        return JSON.parse(fenceMatch[1].trim());
      } catch {
        // fall through
      }
    }

    // Try to find JSON object or array in the text
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // Remove trailing commas before } or ]
        const cleaned = jsonMatch[1].replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(cleaned);
      }
    }

    throw new Error(`Failed to parse Claude response as JSON: ${text.substring(0, 200)}`);
  }
}
