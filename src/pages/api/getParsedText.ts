// pages/api/getParsedText.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@auth0/nextjs-auth0';
import clientPromise from '@/lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSession(req, res);

    if (!session?.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userSub = session.user.sub;

    const client = await clientPromise;
    const db = client.db('pdfUploader');
    const collection = db.collection('uploads');

    const uploads = await collection
      .find({ userSub: userSub })
      .sort({ uploadedAt: -1 })
      .toArray();

    const parsedUploads = uploads.map((upload) => ({
      _id: upload._id.toString(),
      draftText: upload.parsedText?.draft || '',
      guidelinesText: upload.parsedText?.guidelines || '',
      createdAt: upload.uploadedAt || upload.createdAt || new Date(),
    }));

    return res.status(200).json({ uploads: parsedUploads });
  } catch (error) {
    console.error('Error in getParsedText:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
