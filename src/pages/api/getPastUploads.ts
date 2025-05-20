import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { getSession } from '@auth0/nextjs-auth0';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSession(req, res);
    if (!session?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const client = await clientPromise;
    const db = client.db('pdfUploader');
    const collection = db.collection('uploads');

    const uploads = await collection
      .find({ userId: session.user.sub }, { projection: { _id: 1, uploadedAt: 1 } })
      .sort({ uploadedAt: -1 })
      .limit(10)
      .toArray();

    res.status(200).json({ uploads });
  } catch (error) {
    console.error('Failed to fetch past uploads:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
