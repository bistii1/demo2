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

    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that completes federal research budget templates tab by tab.',
            name: undefined,
          },
          {
            role: 'user',
            content: `Here is the text of a research proposal:\n\n${proposalText}\n\nThis is the "${sheetName}" tab of a PAMS-style budget template as raw array data:\n\n${JSON.stringify(
              json,
            )}\n\nPlease fill in this tab with estimated values based on the proposal. Return only a valid JSON array of arrays representing the tab contents.`,
            name: undefined,
          },
        ],
        temperature: 0.2,
      });

      const aiResponse = response.choices[0]?.message?.content;
      if (!aiResponse) continue;

      try {
        const filledData = JSON.parse(aiResponse); // Expecting an array of arrays from GPT
        const newSheet = XLSX.utils.aoa_to_sheet(filledData);
        workbook.Sheets[sheetName] = newSheet;
      } catch {
        console.warn(`GPT response for tab "${sheetName}" was not valid JSON. Skipped.`);
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
