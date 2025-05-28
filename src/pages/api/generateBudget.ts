import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
apiKey: process.env.OPENAI_API_KEY!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
if (req.method !== 'POST') {
return res.status(405).json({ error: 'Only POST allowed' });
}

const { summaries } = req.body;

if (!summaries || !Array.isArray(summaries)) {
return res.status(400).json({ error: 'Invalid or missing summaries array' });
}

const combined = summaries.join('\n\n');

try {
const completion = await openai.chat.completions.create({
model: 'gpt-4',
temperature: 0.4,
messages: [
{
role: 'system',
content: `You are a grant budget expert. Based on the research proposal summary below, generate:

A bulleted list of estimated roles/resources with yearly cost estimates.

A concise justification paragraph explaining HOW we are using the budget.
It should state each thing that is in the table.
Only include the final budget and justification.`,
},
{
role: 'user',
content: combined,
},
],
});

const content = completion.choices[0]?.message?.content?.trim() || '';
console.log('🔷 OpenAI response content:', content);
if (!content) throw new Error('Empty response from OpenAI');

res.status(200).json({ budgetResponse: content });
} catch (err: unknown) {
const errorMessage = err instanceof Error ? err.message : 'Unknown error';
console.error('🔴 generateBudgetFinal error:', errorMessage);
return res.status(500).json({ error: 'Budget generation failed', detail: errorMessage });
}
}
