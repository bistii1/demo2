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

1. **Estimate the needed roles and resources**:
   - Scientists (senior/junior)
   - Engineers (senior/junior)
   - Technicians
   - Travel
   - Equipment (if any)

2. **Generate an HTML budget table** for 3 years with columns:
   - Role
   - Quantity
   - Year 1 Cost
   - Year 2 Cost
   - Year 3 Cost
   - Total

3. **Write a clear budget justification** in plain text that supports the table, explaining why these roles/resources are needed.

Return the result in JSON format with two fields:
- "tableHtml": the HTML for the budget table
- "justificationText": the justification paragraph(s)
          `.trim(),
        },
        {
          role: 'user',
          content: `Here is the proposal:\n\n${draft}`,
        },
      ],
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error('No content returned from OpenAI');
    }

    // Extract table and justification via basic delimiter logic
    const tableMatch = response.match(/<table[\s\S]*?<\/table>/i);
    const tableHtml = tableMatch ? tableMatch[0] : '<p>No table found.</p>';
    const justificationText = response.replace(tableHtml, '').trim();

    return res.status(200).json({ tableHtml, justificationText });
  } catch (err: any) {
    console.error('🔴 Budget Generation Error:', err);
    return res.status(500).json({
      error: 'Failed to generate budget',
      detail: err.message || 'Unknown error',
    });
  }
}
