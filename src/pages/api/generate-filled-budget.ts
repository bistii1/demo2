// pages/api/generate-filled-budget.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { Fields, Files } from 'formidable';
import { promises as fs } from 'fs';
import * as XLSX from 'xlsx';

export const config = {
  api: {
    bodyParser: false,
  },
};

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
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  try {
    const { fields, files } = await parseForm(req);
    const tabName = fields.tabName?.toString();
    const filledCellsRaw = fields.filledCells?.toString();

    if (!tabName || !filledCellsRaw) {
      return res.status(400).json({ error: 'Missing tabName or filledCells' });
    }

    const filledCells: Record<string, string> = JSON.parse(filledCellsRaw);

    const uploadedFile = files.file;
    const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;
    if (!file || !file.filepath) {
      return res.status(400).json({ error: 'Missing or invalid file upload' });
    }

    const fileBuffer = await fs.readFile(file.filepath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    const sheet = workbook.Sheets[tabName];
    if (!sheet) {
      return res.status(400).json({ error: `Sheet "${tabName}" not found.` });
    }

    const cellAddressRegex = /^[A-Z]+\d+$/;
    for (const [cell, value] of Object.entries(filledCells)) {
      if (!cellAddressRegex.test(cell)) continue;
      sheet[cell] = { t: 's', v: value };
    }

    const updatedBuffer = XLSX.write(workbook, { bookType: 'xlsm', type: 'buffer' });
    const base64Data = updatedBuffer.toString('base64');

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ base64Xlsm: base64Data });
  } catch (err) {
    console.error('Excel generation failed:', err);
    return res.status(500).json({ error: 'Failed to generate Excel file' });
  }
}
