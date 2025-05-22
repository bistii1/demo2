// pages/api/annotateCompliance.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface ComplianceResponse {
  annotatedHtml: string;
  correctedHtml: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  const { draft } = req.body;

  if (!draft || typeof draft !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid draft text' });
  }

  try {
    const chatRes = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: `
You are a research proposal compliance checker. 
You will receive a proposal draft and return:

{
  "annotatedHtml": "original draft with <span style='color:red;'>...</span> tags for missing parts",
  "correctedHtml": "autofilled and complete version of the draft"
}

Only return a valid JSON object.
          `.trim(),
        },
        {
          role: 'user',
          content: draft,
        },
      ],
    });

    const rawText = chatRes.choices[0]?.message?.content;

    if (!rawText) {
      throw new Error('No content received from OpenAI');
    }

    // Try to extract the JSON block using a regular expression
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Raw response:', rawText);
      throw new Error('Failed to extract JSON object from OpenAI response.');
    }

    const parsed: ComplianceResponse = JSON.parse(jsonMatch[0]);

    // Validate fields
    if (
      typeof parsed.annotatedHtml !== 'string' ||
      typeof parsed.correctedHtml !== 'string'
    ) {
      throw new Error('Parsed response is missing required fields');
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('❌ Annotation API error:', err);
    return res.status(500).json({
      error: 'Failed to annotate compliance',
      detail: (err as Error).message,
    });
  }
}
