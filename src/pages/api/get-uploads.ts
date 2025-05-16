import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { getSession } from '@auth0/nextjs-auth0';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getSession(req, res);
  if (!session || !session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('pdfUploader');
    const uploads = await db
      .collection('uploads')
      .find({ userId: session.user.sub }) // only this user's uploads
      .project({ 'guidelines.data': 0, 'draft.data': 0 })
      .sort({ uploadedAt: -1 })
      .toArray();

    res.status(200).json(uploads);
  } catch (error) {
    console.error('Failed to fetch uploads:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
