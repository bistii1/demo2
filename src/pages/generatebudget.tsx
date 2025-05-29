import { useEffect, useState } from 'react';
import Link from 'next/link';
import { exportBudgetToExcel } from '@/utils/exportBudgetToExcel';

export default function GenerateBudgetPage() {
  const [proposalText, setProposalText] = useState('');
  const [budgetResponse, setBudgetResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 0 });
  const [templateFile, setTemplateFile] = useState<File | null>(null);

  useEffect(() => {
    async function fetchLatestProposal() {
      const res = await fetch('/api/getParsedText');
      const data = await res.json();
      const latest = data.uploads?.[0]?.draftText;
      if (latest) setProposalText(latest);
    }
    fetchLatestProposal();
  }, []);

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTemplateFile(e.target.files?.[0] || null);
  };

  const handleGenerate = async () => {
    if (!proposalText) return;

    setLoading(true);
    setError('');
    setBudgetResponse('');
    setChunkProgress({ current: 0, total: 0 });

    const CHUNK_SIZE = 6000;
    const chunks = [];
    for (let i = 0; i < proposalText.length; i += CHUNK_SIZE) {
      chunks.push(proposalText.slice(i, i + CHUNK_SIZE));
    }

    setChunkProgress({ current: 0, total: chunks.length });

    try {
      const summaries: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        setChunkProgress({ current: i + 1, total: chunks.length });

        const res = await fetch('/api/summarizeChunks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chunk: chunks[i] }),
        });

        if (!res.ok) throw new Error('Chunk summarization failed');

        const data = await res.json();
        summaries.push(data.summary || '');
      }

      let finalRes;

      if (templateFile) {
        const formData = new FormData();
        formData.append('summaries', JSON.stringify(summaries));
        formData.append('template', templateFile);

        finalRes = await fetch('/api/generateWithTemplate', {
          method: 'POST',
          body: formData,
        });
      } else {
        finalRes = await fetch('/api/generateBudget', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ summaries }),
        });
      }

      if (!finalRes.ok) throw new Error('Final budget generation failed');

      const finalData = await finalRes.json();
      setBudgetResponse(finalData.budgetResponse);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('🔴 Frontend Error:', errorMessage);
      setError(`Something went wrong generating the budget: ${errorMessage}`);
    } finally {
      setLoading(false);
      setChunkProgress({ current: 0, total: 0 });
    }
  };

  const handleDownloadExcel = () => {
    if (!budgetResponse) return;

    const blob = exportBudgetToExcel(budgetResponse);
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'PAMS_budget.xlsx';
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-100 to-blue-200 py-10 px-4 font-sans">
      <div className="max-w-4xl mx-auto bg-white/95 rounded-3xl shadow-xl p-8 md:p-12">
        <h1 className="text-3xl font-extrabold text-indigo-800 text-center mb-6">Generate Budget</h1>

        <section className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Proposal Text</h2>
          <div className="border rounded-xl p-4 bg-gray-50 shadow-inner max-h-64 overflow-y-auto whitespace-pre-wrap text-sm text-blue-900">
            {loading ? 'Fetching proposal...' : proposalText || 'No proposal found.'}
          </div>
        </section>

        <div className="mb-6">
          <label className="block text-gray-800 font-medium mb-2">Optional: Upload Excel Template</label>
          <input
            type="file"
            accept=".xlsx,.xlsm"
            onChange={handleTemplateUpload}
            className="block w-full text-sm text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm"
          />
        </div>

        <div className="flex justify-center mb-6">
          <button
            onClick={handleGenerate}
            className="bg-green-600 text-white px-6 py-2 rounded-xl shadow hover:bg-green-700 transition-all duration-200"
            disabled={loading || !proposalText}
          >
            {loading ? 'Generating...' : 'Generate Budget'}
          </button>
        </div>

        {chunkProgress.total > 0 && (
          <div className="text-sm text-center text-gray-700 mb-4">
            Summarizing chunk {chunkProgress.current} of {chunkProgress.total}
          </div>
        )}

        {error && <p className="text-red-600 text-center mb-4">{error}</p>}

        {budgetResponse && (
          <section>
            <h2 className="text-lg font-bold text-green-800 mb-2">Budget Estimate & Justification</h2>
            <div className="border rounded-xl bg-green-50 p-4 shadow-inner text-sm whitespace-pre-wrap text-green-900">
              {typeof budgetResponse === 'string'
                ? budgetResponse
                : JSON.stringify(budgetResponse, null, 2)}
            </div>

            <div className="mt-4 flex justify-center">
              <button
                onClick={handleDownloadExcel}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl shadow hover:bg-blue-700 transition-all duration-200"
              >
                Download Excel
              </button>
            </div>
          </section>
        )}

        <Link
          href="/upload"
          className="block mt-10 text-center text-blue-600 font-semibold hover:underline"
        >
          ← Back to Upload
        </Link>
      </div>
    </div>
  );
}
