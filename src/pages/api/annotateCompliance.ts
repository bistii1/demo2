// pages/api/annotateCompliance.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  const { draft } = req.body;

  if (!draft) {
    return res.status(400).json({ error: 'Missing draft text' });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `
You are a compliance checker for research proposals. You will receive a section of a research proposal draft. Your tasks are:
1. Identify compliance issues (e.g., missing abstract, formatting problems, lack of references).
2. Highlight issues in the text using: <span style="color:red;">[...reason...]</span>
3. Then, generate a corrected version of the same section, autofilling with reasonable placeholder text where applicable.

Return a JSON object with:
{
  "annotatedHtml": "...",
  "correctedHtml": "..."
}
          `.trim(),
        },
        {
          role: 'user',
          content: draft,
        },
      ],
      temperature: 0.3,
    });

    const rawText = response.choices[0]?.message?.content;

    if (!rawText) {
      throw new Error('No response from OpenAI.');
    }

    // Try to parse the response safely
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('Failed to parse JSON from OpenAI output.');
    }

    const parsedResponse = JSON.parse(match[0]);
    return res.status(200).json(parsedResponse);
  } catch (err) {
    if (err instanceof Error) {
      console.error('❌ Annotation API error:', err.message);
      return res.status(500).json({
        error: 'Failed to annotate compliance',
        detail: err.message,
      });
    }

    console.error('❌ Unknown error:', err);
    return res.status(500).json({
      error: 'Failed to annotate compliance',
      detail: 'Unknown error occurred',
    });
  }
}
