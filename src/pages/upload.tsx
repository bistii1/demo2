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
    <div className="min-h-screen bg-white text-blue-900">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-4 shadow-md">
        <Link href="/" className="text-lg font-semibold">
          Home
        </Link>
        {user && (
          <button
            onClick={() => (window.location.href = '/api/auth/logout')}
            className="text-red-600 font-semibold"
          >
            Sign Out
          </button>
        )}
      </nav>

      {/* Upload Section */}
      <main className="flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold mb-8">Upload your PDF files</h1>

        <form onSubmit={handleSubmit} className="flex gap-10 mb-6">
          {/* Guidelines Upload */}
          <div className="w-64">
            <label className="block mb-2 font-medium text-gray-800">
              Research Proposal Guidelines (PDF)
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange(setGuidelines)}
              className="border border-gray-400 rounded px-2 py-1 w-full text-gray-800"
            />
            {guidelines && (
              <embed
                src={URL.createObjectURL(guidelines)}
                type="application/pdf"
                className="mt-2 w-full h-40 border rounded"
              />
            )}
          </div>

          {/* Proposal Upload */}
          <div className="w-64">
            <label className="block mb-2 font-medium text-gray-800">
              Draft Proposal (PDF)
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange(setProposal)}
              className="border border-gray-400 rounded px-2 py-1 w-full text-gray-800"
            />
            {proposal && (
              <embed
                src={URL.createObjectURL(proposal)}
                type="application/pdf"
                className="mt-2 w-full h-40 border rounded"
              />
            )}
          </div>
        </form>

        <button
          type="submit"
          form="upload-form"
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Submit
        </button>

        {uploadSuccess && (
          <p className="text-green-600 mt-4 font-semibold">Upload successful! 🎉</p>
        )}
        {error && (
          <p className="text-red-600 mt-4 font-semibold">{error}</p>
        )}
      </main>
    </div>
  );
}
