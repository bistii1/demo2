import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function GenerateBudgetPage() {
const [proposalText, setProposalText] = useState('');
const [budgetResponse, setBudgetResponse] = useState('');
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 0 });

useEffect(() => {
async function fetchLatestProposal() {
const res = await fetch('/api/getParsedText');
const data = await res.json();
const latest = data.uploads?.[0]?.draftText;
if (latest) setProposalText(latest);
}
fetchLatestProposal();
}, []);

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

    const res = await fetch('/api/summarizeChunk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chunk: chunks[i] }),
    });

    if (!res.ok) throw new Error('Chunk summarization failed');

    const data = await res.json();
    summaries.push(data.summary || '');
  }

  const finalRes = await fetch('/api/generateBudgetFinal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ summaries }),
  });

  if (!finalRes.ok) throw new Error('Final budget generation failed');

  const finalData = await finalRes.json();
  setBudgetResponse(finalData.budgetResponse);
} catch (err: any) {
  console.error(err);
  setError('Something went wrong generating the budget.');
} finally {
  setLoading(false);
  setChunkProgress({ current: 0, total: 0 });
}
};

return (
<div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-100 to-blue-200 py-10 px-4 font-sans">
<div className="max-w-4xl mx-auto bg-white/95 rounded-3xl shadow-xl p-8 md:p-12">
<h1 className="text-3xl font-extrabold text-indigo-800 text-center mb-6">Generate Budget</h1>

php-template
Copy
Edit
    <section className="mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-2">Proposal Text</h2>
      <div className="border rounded-xl p-4 bg-gray-50 shadow-inner max-h-64 overflow-y-auto whitespace-pre-wrap text-sm text-blue-900">
        {loading ? 'Fetching proposal...' : proposalText || 'No proposal found.'}
      </div>
    </section>

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
          {budgetResponse}
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