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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-100 to-blue-200 text-blue-900 font-sans flex flex-col">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-6 bg-white/80 shadow-md rounded-b-xl mb-8">
        <Link href="/" className="text-xl font-bold tracking-tight text-blue-700 hover:underline">
          Proposal Edge
        </Link>
        {user && (
          <button
            onClick={() => (window.location.href = '/api/auth/logout')}
            className="text-red-600 font-semibold hover:underline"
          >
            Sign Out
          </button>
        )}
      </nav>

      {/* Centered Upload Section */}
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="bg-white/90 rounded-2xl shadow-2xl p-10 w-full max-w-md flex flex-col items-center">
          <h1 className="text-3xl font-extrabold mb-8 text-center text-indigo-800 tracking-tight">
            Upload Your Draft Proposal
          </h1>

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
                className="border border-gray-300 rounded-lg px-3 py-2 w-full text-gray-800 shadow-sm focus:ring-2 focus:ring-blue-300 transition"
                required
              />
              {proposal && (
                <embed
                  src={URL.createObjectURL(proposal)}
                  type="application/pdf"
                  className="mt-3 w-full h-40 border rounded-lg shadow"
                />
              )}
            </div>
            <button
              type="submit"
              className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white px-8 py-3 rounded-xl shadow-lg font-semibold text-lg hover:from-indigo-700 hover:to-blue-600 transition-all duration-200"
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Submit'}
            </button>
          </form>

          {isUploading && (
            <div className="w-full mt-4">
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-sm mt-2 text-gray-700">Uploading, please wait...</p>
            </div>
          )}

          {uploadSuccess && (
            <div className="flex flex-col items-center mt-6 space-y-4">
              <p className="text-green-600 font-semibold">
                Upload successful! 🎉
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/textpreview">
                  <button className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-2 rounded-lg shadow hover:from-red-600 hover:to-pink-600 transition">
                    Check Compliance
                  </button>
                </Link>
                <Link href="/generatebudget">
                  <button className="bg-gradient-to-r from-blue-600 to-indigo-500 text-white px-6 py-2 rounded-lg shadow hover:from-blue-700 hover:to-indigo-600 transition">
                    Generate Budget
                  </button>
                </Link>
              </div>
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
