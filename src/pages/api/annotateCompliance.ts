// pages/api/annotateCompliance.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { jsonrepair } from 'jsonrepair';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const MAX_CHAR_LIMIT = 16000; // Approx 4 chars per token for gpt-3.5-turbo

function splitText(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + maxLength));
    start += maxLength;
  }
  return chunks;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  const { draft } = req.body;

  if (!draft) {
    return res.status(400).json({ error: 'Missing draft text' });
  }

  const chunks = splitText(draft, MAX_CHAR_LIMIT);

  let allAnnotatedHtml = '';
  let allCorrectedHtml = '';

  try {
    for (let i = 0; i < chunks.length; i++) {
      console.log(`📥 Processing chunk ${i + 1}/${chunks.length}`);

      const chatCompletion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: `
You are a research compliance assistant.

You will receive a chunk of a research proposal draft. Your tasks are:
- Identify common compliance issues (e.g., missing abstract, budget justification, sign-off, formatting, references, methodology).
- Annotate the chunk using HTML by inserting <span style="color:red;">[reason]</span> at each issue.
- Then create a corrected version where you add content inline, also wrapped in <span style="color:red;">[inserted content]</span>.

Return a JSON string in this format:
{
  "annotatedHtml": "...",  // annotated chunk
  "correctedHtml": "..."   // corrected chunk
}

--- DRAFT CHUNK ---
${chunks[i]}
--- END CHUNK ---
            `.trim(),
          },
        ],
        temperature: 0.3,
      });

      const rawResponse = chatCompletion.choices[0]?.message?.content || '{}';
      console.log("📤 Raw chunk response:", rawResponse.slice(0, 200));

      let parsed;
      try {
        parsed = JSON.parse(jsonrepair(rawResponse));
      } catch (err) {
        console.error("❌ Failed to parse JSON for chunk", i + 1);
        return res.status(500).json({
          error: "Failed to parse JSON response from OpenAI",
          detail: err instanceof Error ? err.message : "Unknown error",
        });
      }

      allAnnotatedHtml += parsed.annotatedHtml || '';
      allCorrectedHtml += parsed.correctedHtml || '';
    }

    res.status(200).json({
      annotated: allAnnotatedHtml,
      corrected: allCorrectedHtml,
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
