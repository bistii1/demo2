// /src/pages/api/budget-plan.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { Fields, Files } from 'formidable';
import { promises as fs } from 'fs';
import OpenAI from 'openai';

// Must disable default body parser for formidable
export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Helper to parse form with formidable
function parseForm(req: NextApiRequest): Promise<{ fields: Fields; files: Files }> {
  const form = formidable({ keepExtensions: true });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const { fields, files } = await parseForm(req);

    const draftNotes = fields.draftNotes?.toString();
    if (!draftNotes) {
      return res.status(400).json({ error: 'Missing draftNotes field' });
    }

    const uploadedFile = files.file;
    const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;

    if (!file || !file.filepath) {
      return res.status(400).json({ error: 'Missing or invalid file upload' });
    }

    const fileBuffer = await fs.readFile(file.filepath);
    void fileBuffer; // Placeholder for later use

    const prompt = `
You are an expert research proposal assistant. You have the following budget draft notes extracted from a proposal:

${draftNotes}

You also have an uploaded PAMS-style Excel budget template file (xlsm) with multiple tabs, including an "Instructions" tab outlining what goes where.

Using the instructions and the draft notes, create a detailed, step-by-step plan describing how to fill each tab of the budget sheet with relevant data from the draft notes.

The plan should be clear, concise, and organized by sheet/tab name. Include any assumptions or notes about how to handle empty or ambiguous data.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const writePlan = completion.choices[0]?.message?.content?.trim() ?? '(No plan generated)';
    return res.status(200).json({ writePlan });
  } catch (error) {
    console.error('Error in /api/budget-plan:', error);
    return res.status(500).json({ error: 'Failed to generate budget write plan' });
  }
}
