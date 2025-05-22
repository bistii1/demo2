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

  const { draft } = req.body;

  if (!draft) {
    return res.status(400).json({ error: 'Missing draft text in request body.' });
  }

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: `
You are a research proposal compliance assistant.

You will be given a draft section of a research proposal.

Your tasks:
1. Highlight missing or non-compliant elements using HTML like this:
   <span style="color:red;">[Missing Abstract]</span>
2. Then, provide a corrected version that autofills missing elements using this format:
   <span style="color:blue;">[Auto-filled Abstract: This research will... etc]</span>

⚠️ Return ONLY this strict JSON format:
{
  "annotatedHtml": "<annotated HTML version>",
  "correctedHtml": "<autofilled HTML version>"
}
DO NOT include explanations, markdown, or any extra text.

Here is the draft:
"""${draft}"""
          `.trim(),
        },
      ],
      temperature: 0.3,
    });

    const raw = chatCompletion.choices[0]?.message?.content ?? '';
    console.log("🪵 Raw model response:", raw);

    const parsed = JSON.parse(raw);
    res.status(200).json({
      annotated: parsed.annotatedHtml,
      corrected: parsed.correctedHtml,
    });
  } catch (err: any) {
    console.error("❌ Failed to parse JSON from model or other error:", err);
    res.status(500).json({
      error: 'Failed to annotate compliance',
      detail: err?.message || 'Unknown error',
    });
  }
}
