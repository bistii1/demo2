// pages/api/generateBudgetWithTemplate.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import * as XLSX from 'xlsx';

export const config = {
    api: {
        bodyParser: false,
    },
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST allowed' });

    const form = formidable({ multiples: true });

    const parsed = await new Promise<{ summaries?: string[], templatePath?: string }>((resolve, reject) => {
        form.parse(req, async (err, fields, files) => {
            if (err) return reject(err);

            const summaries = JSON.parse(fields.summaries?.[0] || '[]');
            const templateFile = files.template?.[0];

            let templatePath: string | undefined;
            if (templateFile) {
                const buffer = await fs.readFile(templateFile.filepath);
                const tempPath = path.join(process.cwd(), 'tmp', templateFile.originalFilename || 'template.xlsx');
                await fs.writeFile(tempPath, buffer);
                templatePath = tempPath;
            }

            resolve({ summaries, templatePath });
        });
    });

    const combined = parsed.summaries?.join('\n\n');
    if (!combined) return res.status(400).json({ error: 'Invalid summaries format' });

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: `
You are a U.S. DOE grant expert. Given a research proposal summary, generate a PAMS-style budget estimate including:

1. Standard PAMS budget categories:
   - Personnel
   - Fringe Benefits
   - Equipment
   - Travel
   - Materials and Supplies
   - Other Direct Costs
   - Indirect Costs

2. For each category:
   - Show estimated costs for Year 1, Year 2, Year 3, and Total
   - Present it in a **bulleted list or formatted plain text** (no tables for now)

3. Then write a **budget justification paragraph** for each category.

Return:
- Clear labels for each category and year
- Plain, readable output (for now, no HTML or JSON formatting)

Only include the final cohesive budget. Avoid repeating the same category multiple times.
`.trim(),
                },
                {
                    role: 'user',
                    content: combined,
                },
            ],
            temperature: 0.3,
        });

        const responseText = completion.choices?.[0]?.message?.content?.trim();
        if (!responseText) throw new Error('No response from OpenAI');

        // OPTIONAL: If a template was provided, parse and modify it
        if (parsed.templatePath) {
            const workbook = XLSX.readFile(parsed.templatePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Example logic: write GPT summary into a cell
            XLSX.utils.sheet_add_aoa(worksheet, [[responseText]], { origin: 'A10' });

            const outputPath = path.join(process.cwd(), 'tmp', 'filled_template.xlsx');
            XLSX.writeFile(workbook, outputPath);

            return res.status(200).json({
                budgetResponse: responseText,
                templateModifiedPath: '/tmp/filled_template.xlsx',
            });
        }

        return res.status(200).json({ budgetResponse: responseText });
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('🔴 generateBudgetWithTemplate error:', errorMessage);
        return res.status(500).json({ error: 'Failed to generate budget', detail: errorMessage });
    }
}
