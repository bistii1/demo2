import { useEffect, useState } from 'react';

export default function GenerateBudgetPage() {
  const [draftNotes, setDraftNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    async function fetchDraftNotes() {
      try {
        const res = await fetch('/api/generate-budget');

        const reader = res.body?.getReader();
        if (!reader) throw new Error('ReadableStream not supported.');

        let text = '';
        const decoder = new TextDecoder('utf-8');
        let done = false;
        while (!done) {
          const result = await reader.read();
          done = result.done;
          const chunk = decoder.decode(result.value || new Uint8Array(), { stream: !done });
          text += chunk;

          // Extract progress updates from server (assume JSON line-streamed)
          const match = chunk.match(/__PROGRESS__(\d+)/);
          if (match) {
            const percent = parseInt(match[1], 10);
            setProgress(percent);
          }
        }

        const jsonMatch = text.match(/{[\s\S]*}/);
        if (!jsonMatch) throw new Error('No valid JSON in response.');

        const json = JSON.parse(jsonMatch[0]);
        setDraftNotes(json.draftNotes);
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

      {loading && (
        <div>
          <p>Extracting draft notes from your proposal...</p>
          <div className="mt-2 h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="bg-indigo-500 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {error && <p className="text-red-600 font-semibold">{error}</p>}

      {!loading && !error && (
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 whitespace-pre-wrap shadow-md">
          {draftNotes}
        </div>
      )}
    </div>
  );
}
