import { useEffect, useState } from 'react';

export default function TextPreview() {
  const [draftText, setDraftText] = useState('');
  const [guidelinesText, setGuidelinesText] = useState('');

  useEffect(() => {
    const fetchParsedText = async () => {
      try {
        const res = await fetch('/api/parsed-text');
        const data = await res.json();
        setDraftText(data?.draft || '');
        setGuidelinesText(data?.guidelines || '');
      } catch (error) {
        console.error('Failed to fetch parsed text', error);
      }
    };

    fetchParsedText();
  }, []);

  return (
    <div className="min-h-screen bg-white text-black px-6 py-8">
      <h1 className="text-3xl font-bold mb-6">Text Extract Preview</h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-blue-700 mb-2">Draft Text</h2>
        <div className="bg-gray-100 border border-black rounded p-4 whitespace-pre-wrap">
          {draftText || 'No draft text available.'}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-green-700 mb-2">Guidelines Text</h2>
        <div className="bg-gray-100 border border-black rounded p-4 whitespace-pre-wrap">
          {guidelinesText || 'No guidelines text available.'}
        </div>
      </div>

      <button
        onClick={() => (window.location.href = '/upload')}
        className="mt-4 px-6 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700"
      >
        ← Back to Uploads
      </button>
    </div>
  );
}
