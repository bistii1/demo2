import { useEffect, useState, FormEvent, ChangeEvent } from 'react';

export default function GenerateBudgetPage() {
  const [draftNotes, setDraftNotes] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [loadingDraft, setLoadingDraft] = useState<boolean>(true);
  const [xlsmFile, setXlsmFile] = useState<File | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [processingTabs, setProcessingTabs] = useState<boolean>(false);

  useEffect(() => {
    async function fetchAndSummarizeChunks() {
      try {
        const countRes = await fetch('/api/generate-budget?chunkIndex=count');
        const countData = await countRes.json();
        const total: number = countData.chunkCount;
        setProgress(0);

        for (let i = 0; i < total; i++) {
          const res = await fetch(`/api/generate-budget?chunkIndex=${i}`);
          if (!res.ok) throw new Error(await res.text());
          await res.json(); // Ignore interim summaries if not needed
          setProgress((i + 1) / total);
        }

        const finalRes = await fetch(`/api/generate-budget?chunkIndex=all`);
        if (!finalRes.ok) throw new Error(await finalRes.text());
        const finalData = await finalRes.json();
        setDraftNotes(finalData.draftNotes);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(message);
      } finally {
        setLoadingDraft(false);
      }
    }

    fetchAndSummarizeChunks();
  }, []);

  async function handleFileUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!xlsmFile || !draftNotes) {
      alert('Missing file or draft notes');
      return;
    }

    try {
      setError('');
      setProcessingTabs(true);
      setDownloadUrl(null);

      const formData = new FormData();
      formData.append('file', xlsmFile);
      formData.append('draftNotes', draftNotes);

      const res = await fetch('/api/generate-filled-budget', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const fallback = await res.text();
        throw new Error(fallback || 'Failed to generate filled Excel');
      }

      const json = await res.json();
      const base64Xlsm: string = json.base64Xlsm;

      const byteCharacters = atob(base64Xlsm);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      const blob = new Blob([byteArray], {
        type: 'application/vnd.ms-excel.sheet.macroEnabled.12',
      });

      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error generating filled Excel';
      setError(message);
    } finally {
      setProcessingTabs(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-800 p-10">
      <h1 className="text-3xl font-bold mb-6 text-indigo-700">Step 1: Draft Notes</h1>

      {loadingDraft ? (
        <>
          <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden mb-4">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="text-gray-600">Summarizing proposal chunks... {Math.round(progress * 100)}%</p>
        </>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <div className="bg-gray-100 p-6 rounded border whitespace-pre-wrap shadow mb-8">
          {draftNotes}
        </div>
      )}

      <h2 className="text-2xl font-semibold mb-4 text-indigo-700">Step 2: Upload Budget Template</h2>
      <form onSubmit={handleFileUpload} className="mb-6">
        <input
          name="file"
          type="file"
          accept=".xlsm"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setXlsmFile(e.target.files?.[0] || null)
          }
          className="mb-4 block"
          disabled={processingTabs || loadingDraft}
        />
        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          disabled={!xlsmFile || processingTabs || loadingDraft}
        >
          {processingTabs ? `Filling Excel Template...` : 'Generate Budget Sheet'}
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
