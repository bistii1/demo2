import { useEffect, useState } from 'react';

export default function GenerateBudgetPage() {
  const [draftNotes, setDraftNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDraftNotes() {
      try {
        const res = await fetch('/api/generate-budget');
        if (!res.ok) {
          const fallback = await res.text();
          throw new Error(fallback || 'Failed to generate.');
        }
        const data = await res.json();
        setDraftNotes(data.draftNotes);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unknown error.');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchDraftNotes();
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-800 p-10">
      <h1 className="text-3xl font-bold mb-6 text-indigo-700">Step 1: Draft Notes</h1>

      {loading && <p className="text-gray-500">Generating budget-relevant notes...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && (
        <div className="bg-gray-100 p-6 rounded border whitespace-pre-wrap shadow">
          {draftNotes}
        </div>
      )}
    </div>
  );
}
