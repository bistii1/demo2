// pages/api/annotateCompliance.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { jsonrepair } from 'jsonrepair';

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

1. Identify common compliance issues often found in research proposals, including but not limited to:
   - Missing abstract
   - No budget justification
   - Missing institutional sign-off
   - Lack of section formatting (e.g., headings, structure)
   - Missing references or required sections like methodology or objectives

2. Annotate the draft using HTML by inserting 
   <span style="color:red;">[Missing content or issue description]</span> 
   at the location of each issue.

3. Create a corrected version by inserting the **full corrected content inline** in place of or next to the issues. Use:
   <span style="color:red;">[Inserted corrected text]</span> 
   for each addition.

Return a **valid JSON object** formatted exactly like this:

{
  "annotatedHtml": "<html version with red highlights of issues>",
  "correctedHtml": "<html version with corrected additions wrapped in red spans>"
}

Respond ONLY with this JSON object. Do not explain or include anything else.

--- DRAFT START ---
${draft}
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
