// pages/generatebudget.tsx
import { useEffect, useState } from 'react';

export default function GenerateBudgetPage() {
  const [draftNotes, setDraftNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDraftNotes() {
      try {
        const res = await fetch('/api/generate-budget');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Unknown error');
        setDraftNotes(data.draftNotes);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load draft notes.');
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

      {loading && <p>Extracting draft notes from your proposal...</p>}
      {error && <p className="text-red-600 font-semibold">{error}</p>}

      {!loading && !error && (
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 whitespace-pre-wrap shadow-md">
          {draftNotes}
        </div>
      )}
    </div>
  );
}
