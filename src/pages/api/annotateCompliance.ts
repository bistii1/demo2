// pages/api/annotateCompliance.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  const { draft, guidelines } = req.body;

  if (!draft || !guidelines) {
    return res.status(400).json({ error: 'Missing draft or guidelines text' });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: `
You are a proposal compliance checker. The user will give you two documents:
1. A research proposal draft
2. A funding guideline

Your task is to:
- Read both.
- Identify sections in the **draft** that are missing required compliance items based on the **guidelines**.
- Annotate the draft directly using HTML by wrapping missing or insufficient areas in: <span style="color:red;">[...reason...]</span>

Return only the annotated HTML version of the draft.

--- DRAFT START ---
${draft}
--- DRAFT END ---

--- GUIDELINE START ---
${guidelines}
--- GUIDELINE END ---
`.trim(),
        },
      ],
    });

    const annotated = response.choices?.[0]?.message?.content ?? '';
    res.status(200).json({ annotated });
  } catch (err) {
    console.error('Annotation API error:', err);
    res.status(500).json({ error: 'Failed to annotate compliance' });
  }
}
