import { IncomingForm, File as FormidableBaseFile, Files } from 'formidable';
import fs from 'fs/promises';
import pdfParse from 'pdf-parse';
import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { getSession } from '@auth0/nextjs-auth0';

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

    const draftFile = getFile(files.draft);

    if (!draftFile) {
      return res.status(400).json({ message: 'Draft file is required' });
    }

    try {
      const draftBuffer = await fs.readFile(draftFile.filepath);
      const draftText = (await pdfParse(draftBuffer)).text;

      const session = await getSession(req, res);
      const user = session?.user;

      const client = await clientPromise;
      const db = client.db('pdfUploader');
      const collection = db.collection('uploads');

      await collection.insertOne({
        uploadedAt: new Date(),
        userEmail: user?.email || fields.userEmail || 'anonymous',
        userSub: user?.sub || null,
        parsedText: {
          draft: draftText
        },
        draft: {
          filename: draftFile.originalFilename,
          contentType: draftFile.mimetype,
          data: draftBuffer,
        },
      });

      res.status(200).json({ message: 'Upload and parsing successful!' });
    } catch (error) {
      console.error('Upload handler error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}
