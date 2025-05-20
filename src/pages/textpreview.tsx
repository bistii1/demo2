// pages/textpreview.tsx
import { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/router';

export default function TextPreview() {
  const [draftText, setDraftText] = useState('');
  const [guidelinesText, setGuidelinesText] = useState('');
  const [pastUploads, setPastUploads] = useState<any[]>([]);
  const { user } = useUser();
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    const fetchParsedText = async () => {
      try {
        const url = id ? `/api/getParsedText?id=${id}` : '/api/getParsedText';
        const res = await fetch(url);
        const json = await res.json();

        setDraftText(json.draftText);
        setGuidelinesText(json.guidelinesText);
      } catch (error) {
        console.error('Failed to fetch parsed text', error);
      }
    };

    fetchParsedText();
  }, [id]);

  useEffect(() => {
    const fetchPastUploads = async () => {
      if (!user) return;

      try {
        const res = await fetch('/api/getPastUploads');
        const json = await res.json();
        setPastUploads(json.uploads || []);
      } catch (err) {
        console.error('Failed to load past uploads', err);
      }
    };

    fetchPastUploads();
  }, [user]);

  return (
    <div className="min-h-screen bg-white text-black px-6 py-8">
      <h1 className="text-3xl font-bold mb-6">Text Extract Preview</h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-blue-700 mb-2">Draft Text</h2>
        <div className="bg-gray-100 border border-black rounded p-4 whitespace-pre-wrap h-60 overflow-y-auto">
          {draftText || 'No draft text available.'}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-green-700 mb-2">Guidelines Text</h2>
        <div className="bg-gray-100 border border-black rounded p-4 whitespace-pre-wrap h-60 overflow-y-auto">
          {guidelinesText || 'No guidelines text available.'}
        </div>
      </div>

      {user && pastUploads.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-bold text-purple-700 mb-4">Past Uploads</h2>
          <ul className="space-y-2">
            {pastUploads.map((upload) => (
              <li key={upload._id}>
                <button
                  className="text-blue-600 underline hover:text-blue-800"
                  onClick={() => router.push(`/textpreview?id=${upload._id}`)}
                >
                  View Upload from {new Date(upload.uploadedAt).toLocaleString()}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={() => router.push('/upload')}
        className="mt-6 px-6 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700"
      >
        ← Back to Uploads
      </button>
    </div>
  );
}
