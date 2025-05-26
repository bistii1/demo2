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
const fullDraft = draftChunks.join('\n\n');
const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  temperature: 0.4,
  messages: [
    {
      role: 'system',
      content: `
You are a grant budget expert. Given a research proposal draft, your job is to:

Estimate the needed roles and resources:

Scientists (senior/junior)

Engineers (senior/junior)

Technicians

Travel

Equipment (if any)

Present the budget in a bulleted list format with rough yearly cost estimates.

Then write a short budget justification paragraph.

Only return the bullet list followed by the justification. Be concise and professional.
.trim(), }, { role: 'user', content: Here is the complete proposal draft:\n\n${fullDraft}`,
},
],
});

const content = completion.choices?.[0]?.message?.content?.trim();

if (!content) {
  throw new Error('OpenAI returned no usable content');
}

return res.status(200).json({ budgetResponse: content });
} catch (err) {
const errorMessage = err instanceof Error ? err.message : 'Unknown error';
console.error('🔴 Budget Generation Error:', errorMessage);
return res.status(500).json({
error: 'Failed to generate budget',
detail: errorMessage,
});
}
}