import { useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Upload() {
  const { user } = useUser();
  const router = useRouter();

  const [guidelines, setGuidelines] = useState<File | null>(null);
  const [proposal, setProposal] = useState<File | null>(null);

  const handleSubmit = async () => {
    if (!guidelines || !proposal) return alert("Please upload both PDFs.");

    const formData = new FormData();
    formData.append('guidelines', guidelines);
    formData.append('proposal', proposal);

    await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    router.push('/pastuploads');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-blue-900">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 py-4 bg-white shadow-sm">
        <Link href="/" className="text-xl font-semibold">Home</Link>
        <div className="space-x-4">
          <Link href="/pastuploads" className="hover:underline">Past Uploads</Link>
          {user && (
            <Link href="/api/auth/logout" legacyBehavior>
              <a className="text-red-600 font-semibold hover:underline">Sign Out</a>
            </Link>
          )}
        </div>
      </nav>

      {/* Upload Section */}
      <main className="flex flex-col items-center justify-center p-8">
        <div className="bg-white shadow-md rounded-xl p-8 w-full max-w-4xl">
          <h1 className="text-3xl font-bold mb-6 text-center">Upload Your PDF Files</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Guidelines */}
            <div>
              <label className="block text-lg font-medium mb-2">Proposal Guidelines (PDF)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setGuidelines(e.target.files?.[0] || null)}
                className="w-full p-2 border border-gray-300 rounded"
              />
              {guidelines && (
                <embed src={URL.createObjectURL(guidelines)} className="mt-4 w-full h-48 border rounded" />
              )}
            </div>

            {/* Proposal */}
            <div>
              <label className="block text-lg font-medium mb-2">Draft Proposal (PDF)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setProposal(e.target.files?.[0] || null)}
                className="w-full p-2 border border-gray-300 rounded"
              />
              {proposal && (
                <embed src={URL.createObjectURL(proposal)} className="mt-4 w-full h-48 border rounded" />
              )}
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={handleSubmit}
              className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition"
            >
              Submit PDFs
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
