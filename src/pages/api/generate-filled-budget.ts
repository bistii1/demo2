import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { Fields, Files } from 'formidable';
import { promises as fs } from 'fs';
import * as XLSX from 'xlsx';
import OpenAI from 'openai';

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function parseForm(req: NextApiRequest): Promise<{ fields: Fields; files: Files }> {
  const form = formidable({ keepExtensions: true });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

function extractJson(text: string): string | null {
  const jsonMatch = text.match(/```json([\s\S]*?)```/i) || text.match(/```([\s\S]*?)```/i);
  if (jsonMatch) return jsonMatch[1].trim();
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) return braceMatch[0];
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  try {
    const { fields, files } = await parseForm(req);
    const draftNotes = fields.draftNotes?.toString();
    const tabName = fields.tabName?.toString();

    if (!draftNotes || !tabName) {
      return res.status(400).json({ error: 'Missing draftNotes or tabName in request' });
    }

    const uploadedFile = files.file;
    const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;
    if (!file || !file.filepath) {
      return res.status(400).json({ error: 'Missing or invalid file upload' });
    }

    const fileBuffer = await fs.readFile(file.filepath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    const instructionsSheet = workbook.Sheets['Instructions'];
    if (!instructionsSheet) {
      return res.status(400).json({ error: 'Instructions tab not found in Excel template' });
    }

    const instructionsText = XLSX.utils.sheet_to_csv(instructionsSheet);

    const prompt = `
You are filling out a research proposal Excel budget sheet.

Instructions for how to fill the sheet:
${instructionsText}

You are working on the tab "${tabName}".

Based on the instructions and the draft notes below, generate cell values for this tab.

Proposal Draft Notes:
${draftNotes}

Respond ONLY with pure JSON. Do NOT include any explanations, markdown, or other text.

Format your response exactly like this example:
{ "A2": "value", "B2": "value", ... }

If a field has no info in the draft, suggest something reasonable.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content ?? '{}';
    const rawJson = extractJson(responseText) ?? responseText;

    let filledCells: Record<string, string> = {};
    try {
      filledCells = JSON.parse(rawJson);
    } catch {
      console.warn(`Invalid JSON response for tab "${tabName}":`, responseText);
      return res.status(500).json({ error: `Invalid JSON response from AI for tab "${tabName}"` });
    }

    const sheet = workbook.Sheets[tabName];
    if (!sheet) {
      return res.status(400).json({ error: `Sheet "${tabName}" not found in Excel workbook.` });
    }

    const cellAddressRegex = /^[A-Z]+\d+$/;
    for (const [cell, value] of Object.entries(filledCells)) {
      if (!cellAddressRegex.test(cell)) {
        console.warn(`Skipping invalid cell address: ${cell}`);
        continue;
      }
      sheet[cell] = { t: 's', v: value };
    }

    const updatedBuffer = XLSX.write(workbook, { bookType: 'xlsm', type: 'buffer' });
    const base64Data = updatedBuffer.toString('base64');

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      message: `Tab "${tabName}" processed successfully`,
      base64Xlsm: base64Data,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to process budget tab' });
  }
}
