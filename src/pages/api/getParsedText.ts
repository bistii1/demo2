import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const client = await clientPromise;
        const db = client.db('pdfUploader');
        const collection = db.collection('uploads');

        const latestUpload = await collection.findOne({}, { sort: { uploadedAt: -1 } });

        if (!latestUpload) {
            return res.status(404).json({ message: 'No uploads found' });
        }

        res.status(200).json({
            draft: latestUpload.draft?.parsedText || '',
            guidelines: latestUpload.guidelines?.parsedText || '',
        });

    } catch (error) {
        console.error('Failed to fetch parsed text:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
