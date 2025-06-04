// pages/api/extract-tab-names.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { promises as fs } from 'fs';
import * as XLSX from 'xlsx';

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req: NextApiRequest): Promise<{ filePath: string }> {
  const form = formidable({ keepExtensions: true });

  return new Promise((resolve, reject) => {
    form.parse(req, async (err, _fields, files) => {
      if (err) return reject(err);
      const uploaded = files.file;
      const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;
      if (!file || !file.filepath) return reject(new Error('No file uploaded'));
      resolve({ filePath: file.filepath });
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const { filePath } = await parseForm(req);
    const buffer = await fs.readFile(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const tabs = workbook.SheetNames;
    res.status(200).json({ tabs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to extract tab names' });
  }
}
