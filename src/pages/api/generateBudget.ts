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

  const combined = summaries.join('\n\n').trim();

  if (!combined) {
    return res.status(400).json({ error: 'Summaries are empty after combining.' });
  }

  console.log('🧠 Combined summary length (chars):', combined.length);
  console.log('📝 Combined summary preview:\n', combined.slice(0, 500));

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

  const tryModel = async (model: 'gpt-4' | 'gpt-3.5-turbo'): Promise<string> => {
    try {
      const completion = await openai.chat.completions.create({
        model,
        temperature: 0.4,
        messages,
      });

      const content = completion.choices?.[0]?.message?.content?.trim() ?? '';
      console.log(`🔵 OpenAI ${model} response:\n`, content.slice(0, 500));
      return content;
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';
      console.error(`❌ OpenAI ${model} error:`, errMsg);
      throw new Error(`OpenAI ${model} failed: ${errMsg}`);
    }
  };

  try {
    let content = await tryModel('gpt-4');

    if (!content) {
      console.warn('⚠️ GPT-4 returned empty. Trying GPT-3.5-turbo...');
      content = await tryModel('gpt-3.5-turbo');
    }

    if (!content) {
      console.warn('⚠️ All models returned empty. Sending fallback.');
      return res.status(200).json({ budgetResponse: '⚠️ OpenAI returned no response.' });
    }

    console.log('✅ Budget response successfully generated.');
    return res.status(200).json({ budgetResponse: content });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';
    console.error('🔴 generateBudget error:', errorMessage);
    return res.status(500).json({ error: 'Budget generation failed', detail: errorMessage });
  }
}
