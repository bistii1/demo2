// pages/api/generate-budget.ts
import { IncomingForm } from 'formidable';
import { promises as fs } from 'fs';
import * as XLSX from 'xlsx';
import { OpenAI } from 'openai';
import clientPromise from '@/lib/mongodb';
import { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

  const form = new IncomingForm({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parsing error:', err);
      return res.status(500).json({ message: 'Form parsing failed' });
    }

    const file = Array.isArray(files.template) ? files.template[0] : files.template;
    if (!file || !file.filepath) {
      return res.status(400).json({ message: 'No budget template uploaded' });
    }

    try {
      const buffer = await fs.readFile(file.filepath);
      const userEmail = (Array.isArray(fields.userEmail) ? fields.userEmail[0] : fields.userEmail) || 'anonymous';
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
          model: 'gpt-4-1106-preview',
          messages: [
            {
              role: 'system',
              content: `You are a helpful assistant that completes federal research budget templates tab by tab.`,
            },
            {
              role: 'user',
              content: `Here is the text of a research proposal:\n\n${proposalText}\n\nThis is the "${sheetName}" tab of a PAMS-style budget template as raw array data:\n\n${JSON.stringify(json)}\n\nPlease fill in this tab with estimated values based on the proposal.`,
            },
          ],
          temperature: 0.2,
        });

        const aiResponse = response.choices[0]?.message?.content;
        if (!aiResponse) continue;

        try {
          const filledData = JSON.parse(aiResponse); // Expecting array of arrays
          const newSheet = XLSX.utils.aoa_to_sheet(filledData);
          workbook.Sheets[sheetName] = newSheet;
        } catch (_e) {
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
    } catch (e) {
      console.error('Error generating budget:', e);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}
