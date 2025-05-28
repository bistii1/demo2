// pages/api/generateBudget.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { summaries } = req.body;

  if (!summaries || !Array.isArray(summaries)) {
    return res.status(400).json({ error: 'Invalid or missing summaries array' });
  }

  const combined = summaries.join('\n\n');

  if (!combined.trim()) {
    return res.status(400).json({ error: 'Summaries are empty after combining.' });
  }

  console.log('🧠 Combined summary length (chars):', combined.length);
  console.log('🟡 Sending to OpenAI...');

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

  // Try GPT-4 first, fallback to GPT-3.5-turbo if it fails
  const tryModel = async (model: 'gpt-4' | 'gpt-3.5-turbo') => {
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.4,
      messages,
    });
    return completion.choices[0]?.message?.content?.trim() || '';
  };

  try {
    let content = await tryModel('gpt-4');

    // Fallback if GPT-4 fails to return content
    if (!content) {
      console.warn('⚠️ GPT-4 returned empty. Trying GPT-3.5-Turbo...');
      content = await tryModel('gpt-3.5-turbo');
    }

    if (!content) throw new Error('OpenAI returned an empty response.');

    console.log('✅ Budget response generated');
    res.status(200).json({ budgetResponse: content });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    if ('status' in (err as any)) {
      console.error('🔴 OpenAI API Error:', (err as any).status, (err as any).message);
    } else {
      console.error('🔴 generateBudgetFinal error:', errorMessage);
    }

    res.status(500).json({ error: 'Budget generation failed', detail: errorMessage });
  }
}
