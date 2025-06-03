import { useEffect, useState } from 'react';

export default function GenerateBudgetPage() {
  const [draftNotes, setDraftNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [totalChunks, setTotalChunks] = useState(0);

  useEffect(() => {
    async function fetchChunks() {
      try {
        // First, get total chunk count from backend
        // We'll add a new API mode: chunkIndex=count to get number of chunks
        const countRes = await fetch('/api/generate-budget?chunkIndex=count');
        if (!countRes.ok) throw new Error('Failed to get chunk count');
        const { chunkCount } = await countRes.json();
        setTotalChunks(chunkCount);

        const chunkSummaries: string[] = [];

        for (let i = 0; i < chunkCount; i++) {
          const res = await fetch(`/api/generate-budget?chunkIndex=${i}`);
          if (!res.ok) {
            const text = await res.text();
            throw new Error(text || `Failed to get chunk ${i}`);
          }
          const data = await res.json();
          chunkSummaries.push(data.summary);

          setProgress((i + 1) / chunkCount);
        }

        // Now fetch combined summary
        const combinedRes = await fetch('/api/generate-budget?chunkIndex=all');
        if (!combinedRes.ok) {
          const text = await combinedRes.text();
          throw new Error(text || 'Failed to get combined summary');
        }
        const combinedData = await combinedRes.json();

        setDraftNotes(combinedData.draftNotes);
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
        else setError('Unknown error occurred.');
      } finally {
        setLoading(false);
      }
    }

    fetchChunks();
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-800 p-10">
      <h1 className="text-3xl font-bold mb-6 text-indigo-700">Step 1: Draft Notes</h1>

      {loading && (
        <>
          <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden mb-4">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="text-gray-600">Analyzing your draft... {Math.round(progress * 100)}%</p>
        </>
      )}

      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="bg-gray-100 p-6 rounded border whitespace-pre-wrap shadow">
          {draftNotes}
        </div>
      )}
    </div>
  );
}
