import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  try {
    const client = await clientPromise;
    const db = client.db('pdfUploader');
    const collection = db.collection('uploads');

    const query = id ? { _id: new ObjectId(id as string) } : {};
    const upload = await collection.findOne(query);

    if (!upload) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.status(200).json({
      draft: upload.draft?.parsedText || '',
      guidelines: upload.guidelines?.parsedText || '',
    });
  } catch (error) {
    console.error('Failed to fetch parsed text:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
