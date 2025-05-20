import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useUser } from '@auth0/nextjs-auth0/client';

type Upload = {
  _id: string;
  uploadedAt: string;
};

export default function TextPreview() {
  const router = useRouter();
  const { id } = router.query;
  const [draftText, setDraftText] = useState('');
  const [guidelinesText, setGuidelinesText] = useState('');
  const [pastUploads, setPastUploads] = useState<Upload[]>([]);
  const { user } = useUser();

  useEffect(() => {
    const fetchParsedText = async () => {
      try {
        const res = await fetch(`/api/getParsedText${id ? `?id=${id}` : ''}`);
        const data = await res.json();
        setDraftText(data.draft || '');
        setGuidelinesText(data.guidelines || '');
      } catch (err) {
        console.error('Error loading parsed text:', err);
      }
    };

    fetchParsedText();
  }, [id]);

  useEffect(() => {
    const fetchPastUploads = async () => {
      if (!user) return;
      try {
        const res = await fetch('/api/getPastUploads');
        const data = await res.json();
        setPastUploads(data.uploads || []);
      } catch (err) {
        console.error('Error loading past uploads:', err);
      }
    };

    fetchPastUploads();
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Text Extract Preview</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold text-blue-600 mb-2">Draft Text</h2>
        <div className="p-4 border rounded bg-gray-100 whitespace-pre-wrap">
          {draftText ? draftText : 'No draft text available.'}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold text-green-600 mb-2">Guidelines Text</h2>
        <div className="p-4 border rounded bg-gray-100 whitespace-pre-wrap">
          {guidelinesText ? guidelinesText : 'No guidelines text available.'}
        </div>
      </div>

      {user && (
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-2">Your Past Uploads</h2>
          <ul className="space-y-2">
            {pastUploads.map((upload) => (
              <li key={upload._id}>
                <button
                  className="text-blue-500 underline hover:text-blue-700"
                  onClick={() => router.push(`/textpreview?id=${upload._id}`)}
                >
                  {new Date(upload.uploadedAt).toLocaleString()}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link href="/upload" className="text-blue-600 hover:underline">
        ← Back to Uploads
      </Link>
    </div>
  );
}
