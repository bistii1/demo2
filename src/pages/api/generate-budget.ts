// src/pages/api/generate-budget.ts
import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { Fields, Files } from 'formidable';
import { promises as fs } from 'fs';
import * as XLSX from 'xlsx';
import { OpenAI } from 'openai';
import clientPromise from '@/lib/mongodb';

// Disable Next.js default body parser to use formidable
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
    const form = new formidable.IncomingForm({ keepExtensions: true });

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

    console.log('Received fields:', fields);
    console.log('Received files:', files);

    const file = Array.isArray(files.template) ? files.template[0] : files.template;

    if (!file || !('filepath' in file)) {
      return res.status(400).json({ message: 'No budget template uploaded' });
    }

    const buffer = await fs.readFile(file.filepath);
    const userEmail = Array.isArray(fields.userEmail)
      ? fields.userEmail[0]
      : fields.userEmail || 'anonymous';

    console.log('User email:', userEmail);

    const proposalText = await getLatestParsedProposalText(userEmail);

    if (!proposalText) {
      return res.status(400).json({ message: 'No parsed draft proposal found.' });
    }

    console.log('Fetched proposal text length:', proposalText.length);

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;

    console.log('Workbook sheets:', sheetNames);

    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant that completes federal research budget templates tab by tab.',
            },
            {
              role: 'user',
              content: `Here is the text of a research proposal:\n\n${proposalText}\n\nThis is the "${sheetName}" tab of a PAMS-style budget template as raw array data:\n\n${JSON.stringify(
                json
              )}\n\nPlease fill in this tab with estimated values based on the proposal.`,
            },
          ],
          temperature: 0.2,
        });

        const aiResponse = response.choices[0]?.message?.content;
        if (!aiResponse) {
          console.warn(`No AI response for tab "${sheetName}". Skipping.`);
          continue;
        }

        try {
          const filledData = JSON.parse(aiResponse); // expecting array of arrays
          const newSheet = XLSX.utils.aoa_to_sheet(filledData);
          workbook.Sheets[sheetName] = newSheet;
        } catch (jsonErr) {
          console.warn(
            `GPT response for tab "${sheetName}" was not valid JSON. Skipped.`,
            jsonErr
          );
        }
      } catch (openaiErr) {
        console.error(`OpenAI API error on sheet "${sheetName}":`, openaiErr);
        // Optionally: continue or return error here
        return res.status(500).json({
          message: `OpenAI API error on sheet "${sheetName}"`,
          details: openaiErr instanceof Error ? openaiErr.message : String(openaiErr),
        });
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
    if (error instanceof Error) {
      res.status(500).json({
        message: 'Internal server error',
        details: error.message,
        stack: error.stack,
      });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
