import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@auth0/nextjs-auth0';
import clientPromise from '@/lib/mongodb';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function chunkText(text: string, maxChars: number): string[] {
  const chunks = [];
  for (let i = 0; i < text.length; i += maxChars) {
    chunks.push(text.slice(i, i + maxChars));
  }
  return chunks;
}

async function summarizeChunk(chunk: string): Promise<string> {
  const prompt = `
You are a research proposal assistant. From the following section of a proposal draft, extract **only budget-relevant information**, such as:

- People and roles
- Salary, effort, time, or involvement
- Equipment, materials, software, services
- Travel, lodging, transportation
- Facilities or subcontracts
- Any numeric values tied to budgeting

Return the output as clean, concise, scannable bullet points grouped by category. Do not include section headers or chunk labels. If no budget-relevant info is found, say “(No relevant content in this section).”

${chunk}
`.trim();

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    return content || '(No content returned)';
  } catch (error) {
    console.error('Error summarizing chunk:', error);
    return '(Error processing this section)';
  }
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

    const latestUpload = await db
      .collection('uploads')
      .find({ userEmail })
      .sort({ uploadedAt: -1 })
      .limit(1)
      .toArray();

    const fullText = latestUpload[0]?.parsedText?.draft;
    if (!fullText) {
      return res.status(404).json({ error: 'No parsed draft text found' });
    }

    const chunks = chunkText(fullText, 6000); // larger chunks = fewer requests
    const notes: string[] = [];

    for (const chunk of chunks) {
      const summary = await summarizeChunk(chunk);
      notes.push(summary);
    }

    const draftNotes = notes
      .filter((note) => note && note.trim() !== '')
      .join('\n\n');

    res.status(200).json({ draftNotes });
  } catch (error) {
    console.error('Error generating draft notes:', error);
    res.status(500).json({ error: 'Failed to generate draft notes' });
  }
}
