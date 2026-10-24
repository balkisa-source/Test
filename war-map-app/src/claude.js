import Anthropic from '@anthropic-ai/sdk';

// Powers the War Map's ✨ feedback and "read it from a screenshot". The key is
// bundled into the app, so only use this build yourself and keep a spend limit
// on the key.
const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey }) : null;
export const aiAvailable = !!client;

async function ask(content, effort) {
  const msg = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort },
    messages: [{ role: 'user', content }],
  });
  if (msg.stop_reason === 'refusal') throw new Error('Claude couldn’t help with that one.');
  return msg.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

export async function aiText(prompt) {
  return { text: await ask(prompt, 'medium') };
}

export async function aiJson(prompt, images = []) {
  const content = [
    ...images.map(({ b64, mime }) => ({ type: 'image', source: { type: 'base64', media_type: mime, data: b64 } })),
    { type: 'text', text: prompt },
  ];
  const text = await ask(content, 'low');
  const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!m) throw new Error('Couldn’t read that screenshot');
  return JSON.parse(m[0]);
}
