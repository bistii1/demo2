// pages/api/generateBudget.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

function estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4); // ≈4 characters per token on average
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST requests are allowed' });
    }

    const { summaries } = req.body;

    if (!Array.isArray(summaries) || summaries.length === 0) {
        return res.status(400).json({ error: 'Invalid or missing summaries array' });
    }

    const combined = summaries.join('\n\n').trim();

    if (!combined) {
        return res.status(400).json({ error: 'Summaries are empty after combining.' });
    }

    const tokenEstimate = estimateTokenCount(combined);
    console.log(`🧠 Combined summary length: ${combined.length} chars ≈ ${tokenEstimate} tokens`);

    const TOKEN_LIMIT = 6000;
    if (tokenEstimate > TOKEN_LIMIT) {
        return res.status(400).json({
            error: `Combined summary too long. Estimated tokens: ${tokenEstimate} (limit: ${TOKEN_LIMIT})`,
        });
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
            role: 'system',
            content: `
You are a grant budget expert. Based on the summarized research proposal provided, create a PAMS-style budget.

Format it like this:

[Category Name]:
- [Item Name]
  Year 1: $X
  Year 2: $Y
  Year 3: $Z
  Total: $T
  Justification: [A clear, short explanation of the need for this item.]

Repeat for each of these standard categories:
- Personnel
- Fringe Benefits
- Equipment
- Travel
- Materials & Supplies
- Other Direct Costs
- Indirect Costs

Use clean formatting, and ensure every category includes at least one item, or a short line saying "None requested." Be concise and factual, and include realistic estimated costs.
    `.trim(),
        },
        {
            role: 'user',
            content: combined,
        },
    ];
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            temperature: 0.4,
            messages,
        });

        const choice = completion.choices[0]?.message;
        const content = choice?.content?.trim();

        console.log('🔍 Full OpenAI message object:', JSON.stringify(choice, null, 2));

        if (!content || content.length === 0) {
            throw new Error('OpenAI returned an empty or undefined response.');
        }

        console.log('✅ Budget response generated successfully.');
        return res.status(200).json({ budgetResponse: content });
    } catch (err: unknown) {
        const errorMessage =
            err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';

        if (err && typeof err === 'object' && 'status' in err && 'message' in err) {
            console.error(
                '🔴 OpenAI API Error:',
                (err as { status: number; message: string }).status,
                (err as { status: number; message: string }).message
            );
        } else {
            console.error('🔴 Budget generation error:', errorMessage);
        }

        return res.status(500).json({ error: 'Budget generation failed', detail: errorMessage });
    }
}
