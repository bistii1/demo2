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
    return res.status(400).json({ error: 'Missing draft text' });
  }

  console.log("📥 Draft preview:", draft.slice(0, 150));

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: `
You are a research compliance assistant.

You will receive a research proposal draft. Your tasks are:
- Identify common compliance issues often found in research proposals (e.g., missing abstract, no budget justification, missing institutional sign-off, lack of section formatting, missing references or methodology).
- Annotate the draft using HTML by inserting <span style="color:red;">[reason]</span> at the point of each detected issue.
- Then create a corrected version where you add content inline, also wrapped in <span style="color:red;">[inserted content]</span> so the additions are visible.

Return a JSON string in this format:
{
  "annotatedHtml": "...", // draft with red annotations for issues
  "correctedHtml": "..."  // draft with added corrections in red
}

--- DRAFT START ---
${draft}
--- DRAFT END ---
`.trim(),
        },
      ],
      temperature: 0.3,
    });

    console.log("✅ OpenAI API call success");

    const rawResponse = chatCompletion.choices[0]?.message?.content || '';

    try {
      const parsed = JSON.parse(rawResponse);
      res.status(200).json({
        annotated: parsed.annotatedHtml,
        corrected: parsed.correctedHtml,
      });
    } catch (jsonErr) {
      console.error("❌ Failed to parse JSON from model:", jsonErr);
      console.log("📝 Raw response:", rawResponse);
      res.status(500).json({
        error: 'Invalid response format from OpenAI',
        detail: rawResponse,
      });
    }

  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("❌ Annotation API error:", err.message);
      res.status(500).json({
        error: 'Failed to annotate compliance',
        detail: err.message,
      });
    } else {
      console.error("❌ Unknown error:", err);
      res.status(500).json({
        error: 'Failed to annotate compliance',
        detail: 'Unknown error occurred',
      });
    }
  }
}
