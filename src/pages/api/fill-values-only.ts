// pages/api/fill-values-only.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function extractJson(text: string): string | null {
  const jsonMatch = text.match(/```json([\s\S]*?)```/i) || text.match(/```([\s\S]*?)```/i);
  if (jsonMatch) return jsonMatch[1].trim();
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) return braceMatch[0];
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST method allowed' });

  const { draftNotes, instructionsText, tabName } = req.body;
  if (!draftNotes || !instructionsText || !tabName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const prompt = `
You are filling out a research proposal Excel budget sheet.

Instructions for how to fill the sheet:
${instructionsText}

You are working on the tab "${tabName}".

Based on the instructions and the draft notes below, generate cell values for this tab.

Proposal Draft Notes:
${draftNotes}

Respond ONLY with pure JSON. Do NOT include any explanations, markdown, or other text.

Format your response exactly like this example:
{ "A2": "value", "B2": "value", ... }

If a field has no info in the draft, suggest something reasonable.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content ?? '{}';
    const rawJson = extractJson(responseText) ?? responseText;
    const filledCells = JSON.parse(rawJson);

    return res.status(200).json({ filledCells });
  } catch (err) {
    console.error('Error during GPT call:', err);
    return res.status(500).json({ error: 'Failed to generate filled cells' });
  }
}
