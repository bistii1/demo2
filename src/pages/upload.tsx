// pages/upload.tsx
import { useState, FormEvent, ChangeEvent } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import Link from 'next/link';

export default function Upload() {
  const { user } = useUser();

  const [proposal, setProposal] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploadSuccess(false);
    setError('');
    setIsUploading(true);
    setProgress(0);

    if (!proposal) {
      setError('Please upload your draft proposal PDF.');
      setIsUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append('draft', proposal);
    formData.append('userEmail', user?.email || 'anonymous');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Upload failed: ${text}`);
      }

      setUploadSuccess(true);
      setProposal(null);
    } catch (err) {
      setError('Something went wrong while uploading.');
      console.error(err);
    } finally {
      setIsUploading(false);
      setProgress(100);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setProposal(e.target.files?.[0] || null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-indigo-100 to-blue-200 flex flex-col">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-6 bg-white/90 shadow-sm border-b border-blue-100">
        <Link href="/" className="text-2xl font-bold tracking-tight text-indigo-700 hover:underline">
          Proposal Edge
        </Link>
        {user && (
          <button
            onClick={() => (window.location.href = '/api/auth/logout')}
            className="text-red-600 font-semibold hover:underline transition"
          >
            Sign Out
          </button>
        )}
      </nav>

      {/* Centered Upload Section */}
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-10 w-full max-w-lg flex flex-col items-center">
          <h1 className="text-3xl font-extrabold mb-6 text-center text-indigo-800 tracking-tight">
            Upload Draft Proposal
          </h1>
          <p className="mb-8 text-gray-500 text-center max-w-md">
            Please upload your draft proposal as a PDF file. After uploading, you can check compliance with the guidelines.
          </p>

          <form
            id="upload-form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-6 w-full items-center"
          >
            <div className="w-full">
              <label className="block mb-2 font-medium text-gray-700 text-center">
                Draft Proposal (PDF)
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full text-gray-800 shadow-sm focus:ring-2 focus:ring-indigo-300 transition file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                required
              />
              {proposal && (
                <embed
                  src={URL.createObjectURL(proposal)}
                  type="application/pdf"
                  className="mt-4 w-full h-48 border rounded-lg shadow"
                />
              )}
            </div>
            <button
              type="submit"
              className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white px-8 py-3 rounded-xl shadow-lg font-semibold text-lg hover:from-indigo-700 hover:to-blue-600 transition-all duration-200 w-full"
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Submit'}
            </button>
          </form>

          {isUploading && (
            <div className="w-full mt-4">
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className="h-2 bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-sm mt-2 text-gray-700">Uploading, please wait...</p>
            </div>
          )}

          {uploadSuccess && (
            <div className="flex flex-col items-center mt-8 space-y-4 w-full">
              <div className="flex items-center gap-2 text-green-700 font-semibold text-lg">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Upload successful!
              </div>
              <Link href="/textpreview" className="w-full">
                <button className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-2 rounded-lg shadow hover:from-green-600 hover:to-emerald-600 transition w-full font-semibold">
                  Check Compliance
                </button>
              </Link>
            </div>
          )}

          {error && (
            <p className="text-red-600 mt-6 font-semibold text-center">
              {error}
            </p>
          )}
        </div>
      </main>

      {/* Custom font import */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        html {
          font-family: 'Inter', sans-serif;
        }
      `}</style>
    </div>
  );
}
