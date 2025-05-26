// pages/api/generateBudget.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  const { draft } = req.body;

  if (!draft || typeof draft !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid draft text' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      temperature: 0.5,
      messages: [
        {
          role: 'system',
          content: `
You are a grant budget expert. Given a research proposal draft, your job is to:

1. Estimate the needed roles and resources:
   - Scientists (senior/junior)
   - Engineers (senior/junior)
   - Technicians
   - Travel
   - Equipment (if any)

2. Present the budget in a bulleted list format (not a table).

3. Provide a budget justification section in plain text.

Respond only in this format:
- Bullet list of estimated budget items with yearly cost estimates
- A short budget justification paragraph
          `.trim(),
        },
        {
          role: 'user',
          content: `Here is the proposal:\n\n${draft}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? '';

    if (!content || content.trim().length === 0) {
      throw new Error('Empty response from OpenAI');
    }

    return res.status(200).json({ budgetResponse: content });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('🔴 Budget Generation Error:', errorMessage);
    return res.status(500).json({
      error: 'Failed to generate budget',
      detail: errorMessage,
    });
  }
}
