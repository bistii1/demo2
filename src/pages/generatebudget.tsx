// pages/generateBudget.tsx
'use client';

import { useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client'; // adjust import based on your auth lib

export default function GenerateBudget() {
  const [template, setTemplate] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { user } = useUser(); // get user from Auth0

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTemplate(e.target.files?.[0] || null);
  };

  const handleSubmit = async () => {
    if (!template) {
      setError('Please upload a PAMS budget Excel template (.xlsm)');
      return;
    }

    setLoading(true);
    setError('');
    setDownloadUrl(null);

    const formData = new FormData();
    formData.append('template', template);
    formData.append('userEmail', user?.email || 'anonymous'); // send userEmail

    try {
      const res = await fetch('/api/generate-budget', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to generate budget');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-xl border border-gray-200">
        <h1 className="text-3xl font-bold text-center text-indigo-700 mb-4">
          Generate Budget Sheet
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Upload your PAMS-style Excel sheet (.xlsm). We’ll fill it in using your uploaded proposal.
        </p>

        <input
          type="file"
          accept=".xlsm"
          onChange={handleFileChange}
          className="mb-4 w-full"
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg shadow hover:bg-indigo-700 transition w-full font-semibold"
        >
          {loading ? 'Generating...' : 'Generate Budget'}
        </button>

        {error && <p className="text-red-600 mt-4 text-center">{error}</p>}

        {downloadUrl && (
          <div className="mt-6 text-center">
            <a
              href={downloadUrl}
              download="filled-budget.xlsm"
              className="text-green-600 font-semibold underline"
            >
              Download Filled Budget Sheet
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
