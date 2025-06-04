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
          if (!res.ok) {
            const fallback = await res.text();
            throw new Error(fallback || `Failed to process chunk ${i}`);
          }
          const data = await res.json();
          summaries.push(data.summary);
          setProgress((i + 1) / total);
        }

        const finalRes = await fetch(`/api/generate-budget?chunkIndex=all`);
        if (!finalRes.ok) {
          const fallback = await finalRes.text();
          throw new Error(fallback || 'Failed to combine summaries');
        }
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
    e.preventDefault(); // Prevent form submission
    e.stopPropagation(); // Prevent bubbling

    const uploaded = e.target.files?.[0];
    setDownloadLink(null);
    setSelectedTab('');
    setTabNames([]);
    setFile(null);

    if (!uploaded) return;

    const formData = new FormData();
    formData.append('file', uploaded);

    const res = await fetch('/api/extract-tab-names', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const { tabs } = await res.json();
      setTabNames(tabs);
      setFile(uploaded);
    } else {
      setError('Failed to extract tabs from Excel file');
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

    const res = await fetch('/api/generate-filled-budget', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const { error } = await res.json();
      setError(error || 'Failed to generate filled budget');
      setIsSubmitting(false);
      return;
    }

    const { base64Xlsm } = await res.json();
    const blob = new Blob([Uint8Array.from(atob(base64Xlsm), c => c.charCodeAt(0))], {
      type: 'application/vnd.ms-excel.sheet.macroEnabled.12',
    });

    const url = URL.createObjectURL(blob);
    setDownloadLink(url);
    setIsSubmitting(false);
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

      {/* Upload Excel and Generate */}
      {!loading && draftNotes && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 font-medium">Upload PAMS Excel Template (.xlsm)</label>
            <input type="file" accept=".xlsm" onChange={handleFileChange} />
          </div>

          {tabNames.length > 0 && (
            <div>
              <label className="block mb-2 font-medium">Select Tab to Fill</label>
              <select
                value={selectedTab}
                onChange={(e) => setSelectedTab(e.target.value)}
                className="border rounded p-2 w-full"
              >
                <option value="">-- Select a tab --</option>
                {tabNames.map((tab) => (
                  <option key={tab} value={tab}>
                    {tab}
                  </option>
                ))}
              </select>
            </div>
          )}

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
