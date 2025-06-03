import { useEffect, useState } from 'react';

export default function GenerateBudgetPage() {
  const [draftNotes, setDraftNotes] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalChunks, setTotalChunks] = useState(0);

  useEffect(() => {
    async function fetchAndSummarizeChunks() {
      try {
        // Step 1: Get chunk count
        const countRes = await fetch('/api/generate-budget?chunkIndex=count');
        const countData = await countRes.json();
        const total = countData.chunkCount;

        setTotalChunks(total);

        const summaries: string[] = [];

        // Step 2: Process each chunk
        for (let i = 0; i < total; i++) {
          const res = await fetch(`/api/generate-budget?chunkIndex=${i}`);
          if (!res.ok) {
            const fallback = await res.text();
            throw new Error(fallback || `Failed to process chunk ${i}`);
          }
          const data = await res.json();
          summaries.push(data.summary);
          setProgress((i + 1) / total); // update progress bar
        }

        // Step 3: Combine final summary
        const finalRes = await fetch(`/api/generate-budget?chunkIndex=all`);
        if (!finalRes.ok) {
          const fallback = await finalRes.text();
          throw new Error(fallback || 'Failed to combine summaries');
        }
        const finalData = await finalRes.json();
        setDraftNotes(finalData.draftNotes);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unknown error occurred.');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchAndSummarizeChunks();
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
          <p className="text-gray-600">
            Summarizing proposal chunks... {Math.round(progress * 100)}% ({Math.round(progress * totalChunks)} of {totalChunks})
          </p>
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
