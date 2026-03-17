import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY,
});

const STYLE_DESCRIPTIONS = {
  traditional: 'traditional Indian/Pakistani henna with intricate paisleys, florals, and geometric patterns',
  arabic: 'Arabic henna style with bold floral motifs, large open spaces, and flowing vines',
  geometric: 'modern geometric henna with sharp lines, triangles, mandalas, and symmetrical patterns',
  moroccan: 'Moroccan henna with dense geometric grids, diamond shapes, and stylized florals',
};

const COMPLEXITY_DESCRIPTIONS = {
  simple: 'simple and minimal with few elements, good for beginners to trace',
  medium: 'moderately detailed with a balanced mix of motifs',
  intricate: 'highly detailed and complex with layered patterns filling the space',
};

const PLACEMENT_DESCRIPTIONS = {
  hand: 'a hand and wrist',
  arm: 'a forearm',
  foot: 'a foot and ankle',
  back: 'a back of the hand',
};

export async function generateHennaDesign({ style, complexity, placement, customPrompt }) {
  const styleDesc = STYLE_DESCRIPTIONS[style] || STYLE_DESCRIPTIONS.traditional;
  const complexityDesc = COMPLEXITY_DESCRIPTIONS[complexity] || COMPLEXITY_DESCRIPTIONS.medium;
  const placementDesc = PLACEMENT_DESCRIPTIONS[placement] || PLACEMENT_DESCRIPTIONS.hand;

  const prompt = `Create an SVG henna design for ${placementDesc}.
Style: ${styleDesc}.
Complexity: ${complexityDesc}.
${customPrompt ? `Additional notes: ${customPrompt}` : ''}

Requirements:
- Output ONLY valid SVG code, nothing else — no markdown, no explanation
- Use viewBox="0 0 400 600"
- Use dark brown color (#4a1c00) for all paths and shapes
- No fill on paths, only stroke, strokeWidth between 1.5 and 2.5
- Include a mix of: paisleys, flowers, leaves, dots, and geometric accents appropriate to the style
- The design should be suitable for someone to trace onto their skin
- Center the design nicely within the viewBox
- Make it look like authentic henna artwork`;

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const svgText = message.content[0].text.trim();

  // Extract SVG if wrapped in anything
  const svgMatch = svgText.match(/<svg[\s\S]*<\/svg>/i);
  if (!svgMatch) throw new Error('No valid SVG returned from AI');

  return svgMatch[0];
}
