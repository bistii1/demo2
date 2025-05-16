// pages/api/upload.ts
import { IncomingForm, File as FormidableBaseFile, Files } from 'formidable';
import fs from 'fs/promises';
import { MongoClient } from 'mongodb';
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface FormidableFile extends FormidableBaseFile {
  filepath: string;
  originalFilename: string | null;
  mimetype: string | null;
}

const MONGODB_URI = process.env.MONGODB_URI || '';

async function connectToDB() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  return client.db('pdfUploader');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const form = new IncomingForm({ keepExtensions: true, multiples: true });

  form.parse(req, async (err, fields, files: Files) => {
    if (err) {
      console.error('Form parsing error:', err);
      return res.status(500).json({ message: 'File parsing error' });
    }

    const getFile = (f: FormidableBaseFile | FormidableBaseFile[] | undefined): FormidableFile | null => {
      if (!f) return null;
      const file = Array.isArray(f) ? f[0] : f;
      return file as FormidableFile;
    };

    const guidelinesFile = getFile(files.guidelines);
    const proposalFile = getFile(files.proposal); // corrected field name

    if (!guidelinesFile || !proposalFile) {
      return res.status(400).json({ message: 'Both files are required' });
    }

    try {
      const guidelinesBuffer = await fs.readFile(guidelinesFile.filepath);
      const proposalBuffer = await fs.readFile(proposalFile.filepath);

      const db = await connectToDB();
      const collection = db.collection('uploads');

      await collection.insertOne({
        uploadedAt: new Date(),
        guidelines: {
          filename: guidelinesFile.originalFilename,
          contentType: guidelinesFile.mimetype,
          data: guidelinesBuffer,
        },
        proposal: {
          filename: proposalFile.originalFilename,
          contentType: proposalFile.mimetype,
          data: proposalBuffer,
        },
      });

      res.status(200).json({ message: 'Upload successful!' });
    } catch (error) {
      console.error('DB Error:', error);
      res.status(500).json({ message: 'Database error' });
    }
  });
}
