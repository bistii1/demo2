import { useEffect, useState } from 'react';

export default function GenerateBudgetPage() {
  const [draftNotes, setDraftNotes] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalChunks, setTotalChunks] = useState(0);

  const [xlsmFile, setXlsmFile] = useState<File | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // === STEP 1: Get draftNotes from proposal chunks ===
  useEffect(() => {
    async function fetchAndSummarizeChunks() {
      try {
        const countRes = await fetch('/api/generate-budget?chunkIndex=count');
        const countData = await countRes.json();
        const total = countData.chunkCount;
        setTotalChunks(total);

        const summaries: string[] = [];

        for (let i = 0; i < total; i++) {
          const res = await fetch(`/api/generate-budget?chunkIndex=${i}`);
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          summaries.push(data.summary);
          setProgress((i + 1) / total);
        }

        const finalRes = await fetch(`/api/generate-budget?chunkIndex=all`);
        if (!finalRes.ok) throw new Error(await finalRes.text());
        const finalData = await finalRes.json();
        setDraftNotes(finalData.draftNotes);
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
        else setError('Unknown error occurred.');
      } finally {
        setLoading(false);
      }
    }

    fetchAndSummarizeChunks();
  }, []);

  // === STEP 2: Handle xlsm upload + get filled Excel ===
  async function handleFileUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!xlsmFile || !draftNotes) return alert('Missing file or draft notes');

    const formData = new FormData();
    formData.append('file', xlsmFile);
    formData.append('draftNotes', draftNotes);

    try {
      setUploading(true);
      setDownloadUrl(null);

      const res = await fetch('/api/generate-filled-budget', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const fallback = await res.text();
        throw new Error(fallback || 'Failed to generate filled Excel');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error generating filled Excel');
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-800 p-10">
      <h1 className="text-3xl font-bold mb-6 text-indigo-700">Step 1: Draft Notes</h1>

      {loading ? (
        <>
          <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden mb-4">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="text-gray-600">
            Summarizing proposal chunks... {Math.round(progress * 100)}% (
            {Math.round(progress * totalChunks)} of {totalChunks})
          </p>
        </>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <div className="bg-gray-100 p-6 rounded border whitespace-pre-wrap shadow mb-8">
          {draftNotes}
        </div>
      )}

      {/* === STEP 2: Upload XLSM and get filled budget === */}
      <h2 className="text-2xl font-semibold mb-4 text-indigo-700">Step 2: Upload Budget Template</h2>
      <form onSubmit={handleFileUpload} className="mb-6">
        <input
          name="file"
          type="file"
          accept=".xlsm"
          onChange={(e) => setXlsmFile(e.target.files?.[0] || null)}
          className="mb-4 block"
        />
        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          disabled={!xlsmFile || uploading}
        >
          {uploading ? 'Filling Excel Template...' : 'Generate Budget Sheet'}
        </button>
      </form>

      {downloadUrl && (
        <div className="bg-green-50 p-4 rounded shadow border border-green-300">
          <p className="text-green-700 font-medium mb-2">Your filled budget sheet is ready:</p>
          <a
            href={downloadUrl}
            download="filled_budget.xlsm"
            className="text-blue-700 underline hover:text-blue-900"
          >
            Download Excel File
          </a>
        </div>
      )}
    </div>
  );
}
