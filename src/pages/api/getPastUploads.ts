// pages/api/getPastUploads.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise;
    const db = client.db('pdfUploader');
    const collection = db.collection('uploads');

    const uploads = await collection
      .find({}, { projection: { _id: 1, uploadedAt: 1 } })
      .sort({ uploadedAt: -1 })
      .limit(10)
      .toArray();

    res.status(200).json({ uploads });
  } catch (error) {
    console.error('Failed to fetch past uploads:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
