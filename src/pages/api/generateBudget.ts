import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
apiKey: process.env.OPENAI_API_KEY!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
if (req.method !== 'POST') {
return res.status(405).json({ error: 'Only POST requests allowed' });
}

const { draftChunks } = req.body;

if (!draftChunks || !Array.isArray(draftChunks)) {
return res.status(400).json({ error: 'Missing or invalid draftChunks input' });
}

try {
const summaries: string[] = [];


// Step 1: Summarize each chunk for budget-relevant information
for (const chunk of draftChunks) {
  const summaryCompletion = await openai.chat.completions.create({
    model: 'gpt-4',
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content: `
You are a research budget assistant. Summarize the roles, equipment, travel needs, and key activities mentioned in this chunk of a research proposal. Be concise and structured.
Format:

Roles mentioned:

Equipment:

Travel:

Notes:
`.trim(),
},
{
role: 'user',
content: chunk,
},
],
});


const summary = summaryCompletion.choices?.[0]?.message?.content?.trim();
if (summary) {
  summaries.push(summary);
}
}

// Step 2: Use combined summaries to generate the final budget
const combinedSummary = summaries.join('\n\n');

const budgetCompletion = await openai.chat.completions.create({
model: 'gpt-4',
temperature: 0.4,
messages: [
{
role: 'system',
content: `
You are a grant budget expert. Based on the research proposal details below, generate:

A bulleted budget estimate (roles/resources with rough yearly costs for 3 years).

A concise budget justification.

Respond in this format:

Estimated Budget:

[Item] — Year 1: $X, Year 2: $Y, Year 3: $Z
...

Justification:
[One or two paragraphs justifying the budget]
.trim(), }, { role: 'user', content: Here are the key requirements extracted from the proposal:\n\n${combinedSummary}`,
},
],
});

const finalContent = budgetCompletion.choices?.[0]?.message?.content?.trim();

if (!finalContent) {
throw new Error('OpenAI returned empty content during final budget generation.');
}

return res.status(200).json({ budgetResponse: finalContent });
} catch (err) {
const errorMessage = err instanceof Error ? err.message : 'Unknown error';
console.error('🔴 Budget Generation Error:', errorMessage);
return res.status(500).json({
error: 'Failed to generate budget',
detail: errorMessage,
});
}
}