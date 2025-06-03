// pages/api/generate-budget.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@auth0/nextjs-auth0';
import clientPromise from '@/lib/mongodb';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Split text into chunks of maxChars size
function chunkText(text: string, maxChars: number): string[] {
  const chunks = [];
  for (let i = 0; i < text.length; i += maxChars) {
    chunks.push(text.slice(i, i + maxChars));
  }
  return chunks;
}

// Summarize a single chunk with budget extraction prompt
async function summarizeChunk(chunk: string, index: number): Promise<string> {
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

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview', // GPT-4.1 aka o4-mini
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    return content ? `### Chunk ${index + 1}\n${content}` : `### Chunk ${index + 1}\n(No content returned)`;
  } catch (error) {
    console.error(`Error processing chunk ${index + 1}:`, error);
    return `### Chunk ${index + 1}\n(Error processing this chunk)`;
  }
}

// Helper to process chunks in batches of N (to avoid too many parallel requests)
async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  handler: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(handler));
    results.push(...batchResults);
  }
  return results;
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

    const chunks = chunkText(fullText, 2000); // chunk size roughly ~700 tokens

    // Process chunks in batches of 3 to avoid hitting rate limits and timeouts
    const extractedSections = await processInBatches(chunks, 3, summarizeChunk);

    const draftNotes = extractedSections.join('\n\n');

    res.status(200).json({ draftNotes });
  } catch (error) {
    console.error('Error generating draft notes:', error);
    res.status(500).json({ error: 'Failed to generate draft notes' });
  }
}
