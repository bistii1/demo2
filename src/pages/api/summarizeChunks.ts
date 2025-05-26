import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
apiKey: process.env.OPENAI_API_KEY!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
if (req.method !== 'POST') {
return res.status(405).json({ error: 'Only POST allowed' });
}

const { chunk } = req.body;

if (!chunk || typeof chunk !== 'string') {
return res.status(400).json({ error: 'Invalid or missing chunk' });
}

try {
const completion = await openai.chat.completions.create({
model: 'gpt-4',
temperature: 0.3,
messages: [
{
role: 'system',
content: 'You are a research assistant. Summarize this research proposal section for budgeting purposes.',
},
{
role: 'user',
content: chunk,
},
],
});

const summary = completion.choices[0]?.message?.content || '';
console.log('🧩 Summary generated for chunk:', summary);

res.status(200).json({ summary });
} catch (err: unknown) {
const errorMessage = err instanceof Error ? err.message : 'Unknown error';
console.error('🔴 summarizeChunk error:', errorMessage);
return res.status(500).json({ error: 'Chunk summarization failed', detail: errorMessage });
}
}