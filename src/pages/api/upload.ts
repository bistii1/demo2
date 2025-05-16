import { IncomingForm, File as FormidableBaseFile, Files } from 'formidable';
import fs from 'fs/promises';
import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';

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
    const proposalFile = getFile(files.proposal); // NOTE: updated to match frontend

    if (!guidelinesFile || !proposalFile) {
      return res.status(400).json({ message: 'Both files are required' });
    }

    try {
      const guidelinesBuffer = await fs.readFile(guidelinesFile.filepath);
      const proposalBuffer = await fs.readFile(proposalFile.filepath);

      const client = await clientPromise;
      const db = client.db('pdfUploader');
      const collection = db.collection('uploads');

      await collection.insertOne({
        uploadedAt: new Date(),
        guidelines: {
          filename: guidelinesFile.originalFilename,
          contentType: guidelinesFile.mimetype,
          data: guidelinesBuffer,
        },
        draft: {
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
