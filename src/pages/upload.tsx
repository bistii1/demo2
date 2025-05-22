import { useState, FormEvent, ChangeEvent } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import Link from 'next/link';

export default function Upload() {
  const { user } = useUser();

  const [guidelines, setGuidelines] = useState<File | null>(null);
  const [proposal, setProposal] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploadSuccess(false);
    setError('');

    if (!guidelines || !proposal) {
      setError('Please upload both PDFs.');
      return;
    }

    const formData = new FormData();
    formData.append('guidelines', guidelines);
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
      setGuidelines(null);
      setProposal(null);
    } catch (err) {
      setError('Something went wrong while uploading.');
      console.error(err);
    }
  };

  const handleFileChange =
    (setter: (file: File | null) => void) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setter(e.target.files?.[0] || null);
    };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-100 to-blue-200 text-blue-900 font-sans">
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

      {/* Upload Section */}
      <main className="flex flex-col items-center justify-center px-4">
        <div className="bg-white/90 rounded-2xl shadow-2xl p-10 w-full max-w-3xl">
          <h1 className="text-3xl font-extrabold mb-8 text-center text-indigo-800 tracking-tight">
            Upload Your PDF Files
          </h1>

          <form
            id="upload-form"
            onSubmit={handleSubmit}
            className="flex flex-col md:flex-row gap-8 mb-6 justify-center"
          >
            {/* Guidelines Upload */}
            <div className="w-full md:w-64">
              <label className="block mb-2 font-medium text-gray-700">
                Research Proposal Guidelines (PDF)
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange(setGuidelines)}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full text-gray-800 shadow-sm focus:ring-2 focus:ring-blue-300 transition"
              />
              {guidelines && (
                <embed
                  src={URL.createObjectURL(guidelines)}
                  type="application/pdf"
                  className="mt-3 w-full h-40 border rounded-lg shadow"
                />
              )}
            </div>

            {/* Proposal Upload */}
            <div className="w-full md:w-64">
              <label className="block mb-2 font-medium text-gray-700">
                Draft Proposal (PDF)
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange(setProposal)}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full text-gray-800 shadow-sm focus:ring-2 focus:ring-blue-300 transition"
              />
              {proposal && (
                <embed
                  src={URL.createObjectURL(proposal)}
                  type="application/pdf"
                  className="mt-3 w-full h-40 border rounded-lg shadow"
                />
              )}
            </div>
          </form>

          <div className="flex justify-center">
            <button
              type="submit"
              form="upload-form"
              className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white px-8 py-3 rounded-xl shadow-lg font-semibold text-lg hover:from-indigo-700 hover:to-blue-600 transition-all duration-200"
            >
              Submit
            </button>
          </div>

          {/* Upload success / error messages */}
          {uploadSuccess && (
            <div className="flex flex-col items-center mt-6">
              <p className="text-green-600 font-semibold">
                Upload successful! 🎉
              </p>
              <Link href="/textpreview" className="mt-4 inline-block">
                <button className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition">
                  View Budget Info
                </button>
              </Link>
            </div>
          )}
          {error && (
            <p className="text-red-600 mt-6 font-semibold text-center">{error}</p>
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
