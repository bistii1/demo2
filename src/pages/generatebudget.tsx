import { useEffect, useState, ChangeEvent, FormEvent } from 'react';

export default function GenerateBudgetPage() {
  const [draftNotes, setDraftNotes] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalChunks, setTotalChunks] = useState(0);

  const [file, setFile] = useState<File | null>(null);
  const [tabNames, setTabNames] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState('');
  const [downloadLink, setDownloadLink] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch draft notes on load
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
        setError(err instanceof Error ? err.message : 'Unknown error occurred.');
      } finally {
        setLoading(false);
      }
    }

    fetchAndSummarizeChunks();
  }, []);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;

    setError('');
    setDownloadLink(null);
    setSelectedTab('');
    setTabNames([]);
    setFile(uploaded);

    const formData = new FormData();
    formData.append('file', uploaded);

    try {
      const res = await fetch('/api/extract-tab-names', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to extract tabs from Excel file');
      const { tabs } = await res.json();
      setTabNames(tabs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error while reading file');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !selectedTab) {
      setError('Please upload a file and select a tab');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setDownloadLink(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('tabName', selectedTab);
    formData.append('draftNotes', draftNotes);

    try {
      const res = await fetch('/api/generate-filled-budget', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Failed to generate filled budget');
      }

      const { base64Xlsm } = await res.json();
      const blob = new Blob([Uint8Array.from(atob(base64Xlsm), c => c.charCodeAt(0))], {
        type: 'application/vnd.ms-excel.sheet.macroEnabled.12',
      });
      const url = URL.createObjectURL(blob);
      setDownloadLink(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error during budget generation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 p-10 space-y-8">
      <h1 className="text-3xl font-bold text-indigo-700">Step 1: Draft Notes</h1>

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

      {!loading && draftNotes && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 font-medium">Upload PAMS Excel Template (.xlsm)</label>
            <input
              key={file?.name || 'file'}
              type="file"
              accept=".xlsm"
              onChange={handleFileChange}
              className="block w-full"
            />
            {file && <p className="text-sm text-gray-500 mt-1">Selected: {file.name}</p>}
          </div>

          {/*! Replace the existing tabNames.length > 0 block with this */}
          <div style={{ minHeight: '90px' }} className="transition-all">
            <label className="block mb-2 font-medium">Select Tab to Fill</label>
            <select
              value={selectedTab}
              onChange={(e) => setSelectedTab(e.target.value)}
              disabled={tabNames.length === 0}
              className={`border rounded p-2 w-full transition-opacity duration-300 ${tabNames.length === 0 ? 'opacity-40 cursor-not-allowed' : 'opacity-100'
                }`}
            >
              <option value="">
                {tabNames.length === 0 ? 'Waiting for tab names...' : '-- Select a tab --'}
              </option>
              {tabNames.map((tab) => (
                <option key={tab} value={tab}>
                  {tab}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Filling budget...' : 'Generate Filled Budget Tab'}
          </button>

          {downloadLink && (
            <div className="mt-4">
              <a
                href={downloadLink}
                download="filled-budget.xlsm"
                className="text-indigo-600 underline"
              >
                Download Filled Excel File
              </a>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
