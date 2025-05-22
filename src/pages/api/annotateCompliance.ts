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

  // ✅ LOGGING: Inspect incoming request body
  console.log("📥 Incoming draft (preview):", draft.slice(0, 100));
  console.log("📥 Incoming guidelines (preview):", guidelines.slice(0, 100));

  // ✅ LOGGING: Check if env variable is accessible
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Missing OPENAI_API_KEY in environment variables.");
  } else {
    console.log("🔑 API key detected:", process.env.OPENAI_API_KEY.slice(0, 5) + "...");
  }

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
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
      temperature: 0.3,
    });

    console.log("✅ OpenAI API call success");
    console.log("📤 Response:", chatCompletion);

    const annotated = chatCompletion.choices[0]?.message?.content ?? '';
    res.status(200).json({ annotated });
  } catch (err: any) {
    console.error("❌ Annotation API error:", err);
    res.status(500).json({
      error: 'Failed to annotate compliance',
      detail: err?.message || err,
    });
  }
}
