import { IncomingForm, File as FormidableBaseFile, Files } from 'formidable';
import fs from 'fs/promises';
import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';

// @ts-ignore
const pdfParse = require('pdf-parse');

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
    const draftFile = getFile(files.draft); // match frontend field name
    const userEmail = fields.userEmail?.toString() || 'anonymous';

    if (!guidelinesFile || !draftFile) {
      return res.status(400).json({ message: 'Both files are required' });
    }

    try {
      const [guidelinesBuffer, draftBuffer] = await Promise.all([
        fs.readFile(guidelinesFile.filepath),
        fs.readFile(draftFile.filepath),
      ]);

      // Extract text from both PDFs
      const [guidelinesParsed, draftParsed] = await Promise.all([
        pdfParse(guidelinesBuffer),
        pdfParse(draftBuffer),
      ]);

      const client = await clientPromise;
      const db = client.db('pdfUploader');
      const collection = db.collection('uploads');

      await collection.insertOne({
        uploadedAt: new Date(),
        userEmail,
        guidelines: {
          filename: guidelinesFile.originalFilename,
          contentType: guidelinesFile.mimetype,
          data: guidelinesBuffer,
          extractedText: guidelinesParsed.text,
        },
        draft: {
          filename: draftFile.originalFilename,
          contentType: draftFile.mimetype,
          data: draftBuffer,
          extractedText: draftParsed.text,
        },
      });

      res.status(200).json({ message: 'Upload and parsing successful!' });
    } catch (error) {
      console.error('Processing error:', error);
      res.status(500).json({ message: 'Server error during upload' });
    }
  });
}
