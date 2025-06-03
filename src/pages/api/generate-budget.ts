// src/pages/api/generate-budget.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, Fields, Files, File as FormidableFile } from 'formidable';
import { promises as fs } from 'fs';
import * as XLSX from 'xlsx';
import { OpenAI } from 'openai';
import clientPromise from '@/lib/mongodb';

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ParsedFile = FormidableFile;
type CellValue = string | number | boolean | null;

async function parseForm(req: NextApiRequest): Promise<{ fields: Fields; files: Files }> {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({ keepExtensions: true });
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

async function getLatestParsedProposalText(userEmail: string): Promise<string | null> {
  const client = await clientPromise;
  const db = client.db('pdfUploader');
  const latest = await db
    .collection('uploads')
    .find({ userEmail })
    .sort({ uploadedAt: -1 })
    .limit(1)
    .toArray();

  return latest[0]?.parsedText?.draft || null;
}

// Safe JSON parse with fallback
function safeJsonParse<T>(str: string): T | null {
  try {
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
}

// Ask GPT to analyze Excel template structure
async function analyzeTemplateWithGPT(tabsData: Record<string, CellValue[][]>): Promise<any> {
  const prompt = `
You are an assistant that analyzes a budget Excel template.
For each tab, summarize the key headers and what kind of data should be filled.
Respond ONLY with a JSON object mapping tab names to a description string.

Example:
{
  "Tab1": "Headers: A,B,C. Fill numeric budget values.",
  "Tab2": "Personnel costs breakdown.",
  ...
}
Here is the template data (JSON arrays per tab):
${JSON.stringify(tabsData, null, 2)}
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You respond ONLY with JSON.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.0,
  });

  const content = response.choices[0]?.message?.content;
  const parsed = safeJsonParse<Record<string, string>>(content || '');
  if (!parsed) {
    throw new Error('Failed to parse GPT template analysis response');
  }
  return parsed;
}

// Ask GPT to extract budget data from draft given the template summary
async function extractBudgetFromDraftWithGPT(
  draftText: string,
  templateSummary: Record<string, string>,
): Promise<Record<string, CellValue[][]>> {
  const prompt = `
You are an assistant extracting budget data from a research proposal draft.

Based on this budget template summary:
${JSON.stringify(templateSummary, null, 2)}

Here is the proposal draft text:
${draftText}

Return ONLY a JSON object mapping each tab name to a filled 2D array of data matching the tab format.
Example:
{
  "Tab1": [["Header1", "Header2"], ["1000", "2000"]],
  "Tab2": [["Personnel", "Amount"], ["John Doe", "50000"]],
  ...
}
If you cannot fill a tab, return an empty array [].
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You respond ONLY with valid JSON.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 1500,
  });

  const content = response.choices[0]?.message?.content;
  const parsed = safeJsonParse<Record<string, CellValue[][]>>(content || '');
  if (!parsed) {
    throw new Error('Failed to parse GPT budget extraction response');
  }
  return parsed;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { fields, files } = await parseForm(req);

    const file = Array.isArray(files.template)
      ? files.template[0]
      : files.template;

    if (!file || typeof file !== 'object' || !('filepath' in file)) {
      return res.status(400).json({ message: 'No budget template uploaded' });
    }

    const buffer = await fs.readFile((file as ParsedFile).filepath);

    const userEmail = Array.isArray(fields.userEmail)
      ? fields.userEmail[0]
      : fields.userEmail || 'anonymous';

    const proposalText = await getLatestParsedProposalText(userEmail);

    if (!proposalText) {
      return res.status(400).json({ message: 'No parsed draft proposal found.' });
    }

    // Read template workbook and convert all sheets to JSON arrays
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;

    const skipTabs = ['Instructions', 'Notes'];
    const tabsData: Record<string, CellValue[][]> = {};

    for (const sheetName of sheetNames) {
      if (skipTabs.includes(sheetName)) {
        continue;
      }
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as CellValue[][];
      tabsData[sheetName] = json;
    }

    // Step 1: Analyze template with GPT
    const templateSummary = await analyzeTemplateWithGPT(tabsData);

    // Step 2: Extract budget data from proposal draft using GPT
    const budgetData = await extractBudgetFromDraftWithGPT(proposalText, templateSummary);

    // Step 3: Write extracted data back into workbook
    for (const [tabName, tabData] of Object.entries(budgetData)) {
      if (!sheetNames.includes(tabName) || skipTabs.includes(tabName)) {
        continue;
      }

      try {
        const newSheet = XLSX.utils.aoa_to_sheet(tabData);
        workbook.Sheets[tabName] = newSheet;
      } catch (err) {
        console.warn(`Failed to write data for tab "${tabName}":`, err);
      }
    }

    const updatedBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsm',
    });

    res.setHeader('Content-Disposition', 'attachment; filename=filled-budget.xlsm');
    res.setHeader('Content-Type', 'application/vnd.ms-excel.sheet.macroEnabled.12');
    res.send(updatedBuffer);
  } catch (error) {
    console.error('Error generating budget:', error);
    res.status(500).json({ message: 'Internal server error', error: String(error) });
  }
}
