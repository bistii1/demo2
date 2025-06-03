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

async function summarizeChunk(chunk: string, index: number): Promise<string> {
  const prompt = `
You are a research proposal assistant. From the following chunk of a proposal draft, extract **only budget-relevant information**:

- People and roles
- Salary, effort, time, or involvement
- Equipment, materials, software, services
- Travel, lodging, transportation
- Facilities or subcontracts
- Any numeric values tied to budgeting

Return the output in Markdown bullets grouped by category. If nothing budget-relevant is in this chunk, say “(No relevant content in this section).”

Chunk #${index + 1}:

${chunk}
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-1106-preview',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  });

  return completion.choices[0]?.message?.content?.trim() ?? `(No content returned for chunk ${index + 1})`;
}

async function combineSummaries(summaries: string[]): Promise<string> {
  const combinedPrompt = `
You are an expert research proposal assistant. Here are extracted budget-relevant notes from multiple chunks of a proposal draft:

${summaries.join('\n\n---\n\n')}

Please combine these notes into a clear, concise, non-redundant summary organized by category.
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-1106-preview',
    messages: [{ role: 'user', content: combinedPrompt }],
    temperature: 0.3,
  });

  return completion.choices[0]?.message?.content?.trim() ?? '(Failed to generate combined summary)';
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

    const chunks = chunkText(fullText, 2000);
    const uploadId = latestUpload[0]._id;

    const { chunkIndex } = req.query;
    if (chunkIndex === undefined) {
      return res.status(400).json({ error: 'Missing chunkIndex query parameter' });
    }

    if (chunkIndex === 'count') {
      return res.status(200).json({ chunkCount: chunks.length });
    }

    if (chunkIndex === 'all') {
      const savedSummaries = await db
        .collection('budgetSummaries')
        .find({ userEmail, uploadId })
        .sort({ chunkIndex: 1 })
        .toArray();

      if (savedSummaries.length !== chunks.length) {
        return res.status(400).json({
          error: `Not all chunks processed yet. Processed ${savedSummaries.length}/${chunks.length}.`,
        });
      }

      const allSummariesText = savedSummaries.map((s) => s.summaryText);
      const combinedSummary = await combineSummaries(allSummariesText);

      return res.status(200).json({ draftNotes: combinedSummary });
    }

    const index = parseInt(chunkIndex as string, 10);
    if (isNaN(index) || index < 0 || index >= chunks.length) {
      return res.status(400).json({ error: 'Invalid chunkIndex' });
    }

    const existing = await db.collection('budgetSummaries').findOne({
      userEmail,
      uploadId,
      chunkIndex: index,
    });

    if (existing) {
      return res.status(200).json({ chunkIndex: index, summary: existing.summaryText });
    }

    const summary = await summarizeChunk(chunks[index], index);

    await db.collection('budgetSummaries').insertOne({
      userEmail,
      uploadId,
      chunkIndex: index,
      summaryText: summary,
      createdAt: new Date(),
    });

    return res.status(200).json({ chunkIndex: index, summary });
  } catch (error) {
    console.error('Error in generate-budget:', error);
    return res.status(500).json({ error: 'Failed to generate budget summary' });
  }
}
