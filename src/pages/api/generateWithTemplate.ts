// pages/api/generateWithTemplate.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import OpenAI from 'openai';
import * as XLSX from 'xlsx';

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

interface BudgetCategory {
  Year1: number;
  Year2: number;
  Year3: number;
  Total: number;
  Justification: string;
}

type BudgetResponse = Record<string, BudgetCategory>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const form = formidable({ multiples: true });

  const parsed = await new Promise<{ summaries?: string[]; templatePath?: string }>((resolve, reject) => {
    form.parse(req, async (err, fields, files) => {
      if (err) return reject(err);

      const summaries = JSON.parse(fields.summaries?.[0] || '[]');
      const templateFile = files.template?.[0];

      const templatePath = templateFile?.filepath;

      resolve({ summaries, templatePath });
    });
  });

  const combined = parsed.summaries?.join('\n\n');
  if (!combined) {
    return res.status(400).json({ error: 'Invalid summaries format' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: `
You are a U.S. DOE grant expert. Given a research proposal summary, generate a PAMS-style budget estimate.

Return your answer as valid JSON in this format:
{
  "Personnel": {
    "Year1": 100000,
    "Year2": 105000,
    "Year3": 110000,
    "Total": 315000,
    "Justification": "Short paragraph"
  },
  ...
}
Do not include any explanation or formatting outside of the JSON.
          `.trim(),
        },
        { role: 'user', content: combined },
      ],
    });

    const responseText = completion.choices?.[0]?.message?.content?.trim();
    if (!responseText) throw new Error('No response from OpenAI');

    const parsedBudget: BudgetResponse = JSON.parse(responseText);

    if (!parsed.templatePath) {
      return res.status(200).json({ budgetResponse: parsedBudget });
    }

    const workbook = XLSX.readFile(parsed.templatePath);

    const yearSheetMap = {
      Year1: 'Budget Period #1',
      Year2: 'Budget Period #2',
      Year3: 'Budget Period #3',
    };

    const baseCellRow: Record<string, number> = {
      'Personnel': 21,
      'Fringe Benefits': 22,
      'Equipment': 23,
      'Travel': 24,
      'Materials and Supplies': 25,
      'Other Direct Costs': 26,
      'Indirect Costs': 27,
    };

    for (const [category, values] of Object.entries(parsedBudget)) {
      const row = baseCellRow[category];
      if (!row) continue;

      for (const yearKey of ['Year1', 'Year2', 'Year3'] as const) {
        const value = values[yearKey];
        const sheetName = yearSheetMap[yearKey];
        const worksheet = workbook.Sheets[sheetName];
        const cell = 'C' + row;

        if (worksheet && value !== undefined) {
          worksheet[cell] = { t: 'n', v: value };
        }
      }
    }

    // Optional: fill Budget Summary
    const summarySheet = workbook.Sheets['Budget Summary'];
    for (const [category, values] of Object.entries(parsedBudget)) {
      const row = baseCellRow[category];
      if (!row) continue;

      const cell = 'C' + row;
      summarySheet[cell] = { t: 'n', v: values.Total };
    }

    const outputBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    return res.status(200).json({
      budgetResponse: parsedBudget,
      templateModifiedBuffer: outputBuffer.toString('base64'),
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('🔴 generateWithTemplate error:', errorMessage);
    return res.status(500).json({ error: 'Failed to generate budget', detail: errorMessage });
  }
}
