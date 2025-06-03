import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File } from 'formidable';
import { promises as fs } from 'fs';
import OpenAI from 'openai';

export const config = {
  api: {
    bodyParser: false, // Disable default body parser for formidable
  },
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    // Parse multipart form data with formidable
    const form = new formidable.IncomingForm();
    const { fields, files } = await new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    // Validate draftNotes
    const draftNotes = fields.draftNotes as string | undefined;
    if (!draftNotes) {
      return res.status(400).json({ error: 'Missing draftNotes field' });
    }

    // Validate and typecast uploaded file
    const uploadedFile = files.file;
    if (!uploadedFile || Array.isArray(uploadedFile)) {
      return res.status(400).json({ error: 'Missing or invalid file upload' });
    }
    const file = uploadedFile as File;

    // Read file buffer (xlsm template)
    const fileBuffer = await fs.readFile(file.filepath);

    // Compose prompt for GPT-4
    const prompt = `
You are an expert research proposal assistant. You have the following budget draft notes extracted from a proposal:

${draftNotes}

You also have an uploaded PAMS-style Excel budget template file (xlsm) with multiple tabs, including an "Instructions" tab outlining what goes where.

Using the instructions and the draft notes, create a detailed, step-by-step plan describing how to fill each tab of the budget sheet with relevant data from the draft notes.

The plan should be clear, concise, and organized by sheet/tab name. Include any assumptions or notes about how to handle empty or ambiguous data.
`;

    // Call OpenAI GPT-4 chat completion
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
