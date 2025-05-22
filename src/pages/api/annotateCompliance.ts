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

    console.log("📥 Draft preview:", draft.slice(0, 150));
    console.log("📥 Guidelines preview:", guidelines.slice(0, 150));

    try {
        const chatCompletion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'user',
                    content: `
You are a research proposal compliance reviewer.

Your job is to analyze the draft below and identify whether any key elements are missing or insufficient. Focus on common compliance issues like:
- Missing abstract
- No budget justification
- Missing institutional sign-off
- Lack of formatting (e.g., headings, section structure)
- Missing references or required sections like methodology or objectives

Wrap missing or problematic areas in this HTML tag:
<span style="color:red;">[Explain what’s missing here]</span>

Return only the annotated draft HTML.

--- DRAFT START ---
${draft}
--- DRAFT END ---
          `.trim(),
                },
            ],
            temperature: 0.3,
        });

        console.log("✅ OpenAI API call success");
        const annotated = chatCompletion.choices[0]?.message?.content ?? '';
        res.status(200).json({ annotated });
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