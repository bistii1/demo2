// pages/api/annotateCompliance.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { jsonrepair } from 'jsonrepair';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const MAX_CHAR_LIMIT = 16000; // Approx 4 chars per token for gpt-3.5-turbo

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  const { draft, lengthRatio } = req.body;

  if (!draft) {
    return res.status(400).json({ error: 'Missing draft text' });
  }

  const trimmedDraft = draft.slice(0, Math.min(
    Math.floor((lengthRatio ?? 100) / 100 * draft.length),
    MAX_CHAR_LIMIT
  ));

  console.log("📥 Draft preview:", trimmedDraft.slice(0, 150));

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
${trimmedDraft}
--- DRAFT END ---
          `.trim(),
        },
      ],
      temperature: 0.3,
    });

    console.log("✅ OpenAI API call success");
    const rawResponse = chatCompletion.choices[0]?.message?.content || '{}';
    console.log("📤 Raw response:", rawResponse);

    let parsed;
    try {
      parsed = JSON.parse(jsonrepair(rawResponse));
    } catch (err) {
      console.error("❌ Failed to parse or repair JSON:", rawResponse);
      return res.status(500).json({
        error: "Failed to parse JSON response from OpenAI",
        detail: err instanceof Error ? err.message : "Unknown error",
      });
    }

    res.status(200).json({
      annotated: parsed.annotatedHtml,
      corrected: parsed.correctedHtml,
    });
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
