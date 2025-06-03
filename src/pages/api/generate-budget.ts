// pages/api/generate-budget.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { getSession } from '@auth0/nextjs-auth0';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

function chunkText(text: string, maxChars: number): string[] {
  const chunks = [];
  for (let i = 0; i < text.length; i += maxChars) {
    chunks.push(text.slice(i, i + maxChars));
  }
  return chunks;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET allowed' });
  }

  try {
    const session = await getSession(req, res);
    const userEmail = session?.user?.email || 'anonymous';

    const client = await clientPromise;
    const db = client.db('pdfUploader');
    const latestUpload = await db.collection('uploads')
      .find({ userEmail })
      .sort({ uploadedAt: -1 })
      .limit(1)
      .toArray();

    if (!latestUpload.length || !latestUpload[0].parsedText?.draft) {
      return res.status(404).json({ error: 'No parsed draft text found' });
    }

    const fullText = latestUpload[0].parsedText.draft;
    const chunks = chunkText(fullText, 3000); // ~1000 tokens per chunk
    const extractedSections: string[] = [];

    for (const [index, chunk] of chunks.entries()) {
      const prompt = `
You are a research proposal assistant. From the following chunk of a proposal draft, extract **only budget-relevant information**. This includes:

- People and roles
- Salary, effort, time, or involvement
- Equipment, materials, software, services
- Travel, lodging, transportation
- Facilities or subcontracts
- Any numeric values tied to budgeting

Return the output in Markdown bullets grouped by category. If nothing budget-relevant is in this chunk, say “(No relevant content in this section).”

--- CHUNK #${index + 1} ---

${chunk}

--- END CHUNK ---
      `.trim();

      const response = await openai.chat.completions.create({
        model: 'gpt-4-1106-preview', // GPT-4.1 aka o4-mini
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      });

      const chunkOutput = response.choices[0]?.message?.content?.trim();
      if (chunkOutput) {
        extractedSections.push(`### Chunk ${index + 1}\n${chunkOutput}`);
      }
    }

    const draftNotes = extractedSections.join('\n\n');

    res.status(200).json({ draftNotes });
  } catch (error) {
    console.error('Error generating draft notes:', error);
    res.status(500).json({ error: 'Failed to generate draft notes' });
  }
}
