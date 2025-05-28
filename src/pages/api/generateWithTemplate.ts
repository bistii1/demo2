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
          content: `You are a grant budgeting assistant. Using the summary of a research proposal, generate:
          
- A PAMS-style yearly budget in text form.
- Fill in missing budget rows in a template if one is provided.
- Write a concise justification paragraph explaining the budget.

Format clearly. Output should be appropriate for human and Excel processing.`,
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
  } catch (err: any) {
    console.error('🔴 generateBudgetWithTemplate error:', err);
    return res.status(500).json({ error: 'Failed to generate budget', detail: err.message });
  }
}
