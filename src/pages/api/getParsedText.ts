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

    const latestUpload = await collection.findOne(
      { userSub: userSub },
      { sort: { uploadedAt: -1 } }
    );

    if (!latestUpload) {
      return res.status(404).json({ error: 'No uploads found for this user' });
    }

    const draftText = latestUpload.draft?.parsedText || '';
    const guidelinesText = latestUpload.guidelines?.parsedText || '';

    return res.status(200).json({ draftText, guidelinesText });
  } catch (error) {
    console.error('Error in getParsedText:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
