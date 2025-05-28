import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Simple token estimate (not exact)
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { summaries } = req.body;

  if (!Array.isArray(summaries)) {
    return res.status(400).json({ error: 'Invalid or missing summaries array' });
  }

  const combined = summaries.join('\n\n').trim();

  if (!combined) {
    return res.status(400).json({ error: 'Summaries are empty after combining.' });
  }

  const tokenEstimate = estimateTokenCount(combined);
  console.log(`🧠 Combined summary length: ${combined.length} chars ≈ ${tokenEstimate} tokens`);

  // Safety threshold (for gpt-4-8k context)
  const TOKEN_LIMIT = 6000;
  if (tokenEstimate > TOKEN_LIMIT) {
    return res.status(400).json({
      error: `Combined summary is too long for OpenAI. Estimated tokens: ${tokenEstimate} (limit: ${TOKEN_LIMIT}).`,
    });
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `
You are a grant budget expert. Based on the research proposal summary below, generate a budget in the format of a U.S. Department of Energy PAMS-style budget. Include:

1. A bulleted list of roles/resources and estimated yearly costs (3 years).
2. Standard categories: Personnel, Fringe, Equipment, Travel, Materials & Supplies, Other Direct Costs, Indirect Costs.
3. A plain-language justification paragraph for each category explaining how the budget supports the proposal objectives.

Only include the final PAMS-style budget and justifications. Be concise but clear.
      `.trim(),
    },
    {
      role: 'user',
      content: combined,
    },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      temperature: 0.4,
      messages,
    });

    const content = completion.choices[0]?.message?.content?.trim() ?? '';

    if (!content) {
      throw new Error('OpenAI returned an empty response.');
    }

    console.log('✅ OpenAI response received.');
    return res.status(200).json({ budgetResponse: content });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';

    console.error('🔴 Budget generation error:', errorMessage);
    return res
      .status(500)
      .json({ error: 'Budget generation failed', detail: errorMessage });
  }
}
