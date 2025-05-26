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
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: `
You are a grant budget expert. Based on the provided research proposal, your job is to:

1. Estimate the needed roles and resources:
   - Scientists (senior/junior)
   - Engineers (senior/junior)
   - Technicians
   - Travel
   - Equipment (if any)

2. Generate a valid HTML table with columns:
   - Role
   - Quantity
   - Year 1 Cost
   - Year 2 Cost
   - Year 3 Cost
   - Total

3. Write a short, plain-text budget justification explaining why these items are needed.

Please return a response wrapped in a JSON object like this:

{
  "tableHtml": "<table>...</table>",
  "justificationText": "Justification goes here."
}
          `.trim(),
        },
        {
          role: 'user',
          content: `Here is the proposal:\n\n${draft}`,
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content;

    if (!rawContent) {
      throw new Error('No content returned from OpenAI');
    }

    // 1. Try parsing JSON directly (with or without code block)
    const jsonMatch = rawContent.match(/```json([\s\S]*?)```/i);
    const jsonText = jsonMatch ? jsonMatch[1].trim() : rawContent;

    try {
      const parsed = JSON.parse(jsonText);
      return res.status(200).json({
        tableHtml: parsed.tableHtml || '<p>No table found.</p>',
        justificationText: parsed.justificationText || 'No justification provided.',
      });
    } catch {
      // 2. Fallback: extract table & rest
      const tableMatch = rawContent.match(/<table[\s\S]*?<\/table>/i);
      const tableHtml = tableMatch?.[0] || '<p>No table found.</p>';
      const justificationText = rawContent.replace(tableHtml, '').trim() || 'No justification provided.';

      return res.status(200).json({ tableHtml, justificationText });
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('🔴 Budget Generation Error:', errorMessage);
    return res.status(500).json({
      error: 'Failed to generate budget',
      detail: errorMessage,
    });
  }
}
