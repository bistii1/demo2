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
You are a grant budget expert. Your task is to:
1. Estimate necessary personnel/resources (senior/junior scientists & engineers, technicians, travel, equipment).
2. Return:
   - A valid HTML table (with columns: Role, Quantity, Year 1 Cost, Year 2 Cost, Year 3 Cost, Total)
   - A written justification explaining *why* these items are needed.

You MUST return valid JSON with:
{
  "tableHtml": "<table>...</table>",
  "justificationText": "string of explanation"
}
          `.trim(),
        },
        {
          role: 'user',
          content: `Here is the proposal draft:\n\n${draft}`,
        },
      ],
    });

    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      throw new Error('No content returned from OpenAI.');
    }

    // Try to parse the content as JSON
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Fallback: try to extract <table> and everything else as justification
      const tableMatch = responseText.match(/<table[\s\S]*?<\/table>/i);
      const tableHtml = tableMatch ? tableMatch[0] : '<p>No table found.</p>';
      const justificationText = responseText.replace(tableHtml, '').trim() || 'No justification provided.';
      return res.status(200).json({ tableHtml, justificationText });
    }

    return res.status(200).json({
      tableHtml: parsed.tableHtml || '<p>No table returned.</p>',
      justificationText: parsed.justificationText || 'No justification provided.',
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('🔴 Budget Generation Error:', errorMessage);
    return res.status(500).json({
      error: 'Failed to generate budget',
      detail: errorMessage,
    });
  }
}
