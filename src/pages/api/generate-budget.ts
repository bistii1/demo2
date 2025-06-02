// src/pages/api/generate-budget.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, Fields, Files } from 'formidable';
import { promises as fs } from 'fs';
import * as XLSX from 'xlsx';
import { OpenAI } from 'openai';
import clientPromise from '@/lib/mongodb';

// Disable Next.js body parser so formidable can handle multipart form data
export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function parseForm(req: NextApiRequest): Promise<{ fields: Fields; files: Files }> {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({ keepExtensions: true });

    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

async function getLatestParsedProposalText(userEmail: string) {
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

function extractJson(text: string): string | null {
  // Matches the first JSON array in the text (supports multi-line without 's' flag)
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  return jsonMatch ? jsonMatch[0] : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { fields, files } = await parseForm(req);

    const file = Array.isArray(files.template) ? files.template[0] : files.template;

    if (!file || !('filepath' in file)) {
      return res.status(400).json({ message: 'No budget template uploaded' });
    }

    const buffer = await fs.readFile(file.filepath);

    const userEmail = Array.isArray(fields.userEmail)
      ? fields.userEmail[0]
      : fields.userEmail || 'anonymous';

    const proposalText = await getLatestParsedProposalText(userEmail);

    if (!proposalText) {
      return res.status(400).json({ message: 'No parsed draft proposal found.' });
    }

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;

    // Tabs that don’t need filling or may cause parsing errors
    const skipTabs = ['Instructions', 'Notes'];

    // Limit length of proposal text to avoid token overflow
    const maxProposalLength = 3000;
    const shortProposalText =
      proposalText.length > maxProposalLength
        ? proposalText.slice(0, maxProposalLength) + '...'
        : proposalText;

    for (const sheetName of sheetNames) {
      if (skipTabs.includes(sheetName)) {
        console.log(`Skipping tab "${sheetName}"`);
        continue;
      }

      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `
You are an assistant that only replies with valid JSON.

Given the proposal text and the tab data, fill the tab as an array of arrays.

DO NOT add explanations or any text outside of JSON.

If you cannot fill a tab, return an empty array [].

Respond ONLY with valid JSON array of arrays. 
Example:
[
  ["Header1", "Header2"],
  ["Value1", "Value2"]
]
            `,
            name: undefined,
          },
          {
            role: 'user',
            content: `Here is the text of a research proposal:\n\n${shortProposalText}\n\nThis is the "${sheetName}" tab of a PAMS-style budget template as raw array data:\n\n${JSON.stringify(
              json,
            )}\n\nPlease respond ONLY with a valid JSON array of arrays representing the filled tab contents.`,
            name: undefined,
          },
        ],
        temperature: 0.2,
      });

      const aiResponse = response.choices[0]?.message?.content;
      if (!aiResponse) {
        console.warn(`No response from GPT for tab "${sheetName}". Skipping.`);
        continue;
      }

      const rawJson = extractJson(aiResponse);
      if (!rawJson) {
        console.warn(`No JSON found in GPT response for tab "${sheetName}". Skipping.`);
        continue;
      }

      try {
        const filledData = JSON.parse(rawJson);
        const newSheet = XLSX.utils.aoa_to_sheet(filledData);
        workbook.Sheets[sheetName] = newSheet;
      } catch {
        console.warn(`Extracted JSON for tab "${sheetName}" was invalid. Skipping.`);
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
    res.status(500).json({ message: 'Internal server error' });
  }
}
