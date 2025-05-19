import { useEffect, useState } from 'react';

export default function TextPreview() {
  const [draftText, setDraftText] = useState('');
  const [guidelinesText, setGuidelinesText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParsedText = async () => {
      try {
        const res = await fetch('/api/getParsedText');
        const data = await res.json();
        setDraftText(data.draftText);
        setGuidelinesText(data.guidelinesText);
      } catch (err) {
        console.error('Error fetching parsed text:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchParsedText();
  }, []);

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Text Extract Preview</h1>

      <div>
        <h2 className="text-xl font-semibold text-blue-700">Draft Text</h2>
        <pre className="bg-gray-100 p-4 rounded whitespace-pre-wrap">{draftText}</pre>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-green-700">Guidelines Text</h2>
        <pre className="bg-gray-100 p-4 rounded whitespace-pre-wrap">{guidelinesText}</pre>
      </div>
    </div>
  );
}
