import { useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Upload() {
  const { user } = useUser();

  const [guidelines, setGuidelines] = useState<File | null>(null);
  const [proposal, setProposal] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // prevent page reload or redirect

    if (!guidelines || !proposal) return alert("Please upload both PDFs.");

    const formData = new FormData();
    formData.append('guidelines', guidelines);
    formData.append('proposal', proposal);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      setUploadSuccess(true);
    } catch (err) {
      alert("Something went wrong while uploading.");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-white text-blue-900">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-4 shadow-md">
        <Link href="/" className="text-lg font-semibold">Home</Link>
        <div className="space-x-4">
          <Link href="/pastuploads">Past Uploads</Link>
          {user && (
            <Link href="/api/auth/logout" legacyBehavior>
              <a className="text-red-600 font-semibold">Sign Out</a>
            </Link>
          )}
        </div>
      </nav>

      {/* Upload Section */}
      <form onSubmit={handleSubmit} className="flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold mb-8">Upload your PDF files</h1>

        <div className="flex gap-10 mb-6">
          {/* Guidelines */}
          <div className="w-64">
            <label className="block mb-2 font-medium">Research Proposal Guidelines (PDF)</label>
            <input type="file" accept="application/pdf" onChange={(e) => setGuidelines(e.target.files?.[0] || null)} />
            {guidelines && <embed src={URL.createObjectURL(guidelines)} className="mt-2 w-full h-40" />}
          </div>

          {/* Proposal */}
          <div className="w-64">
            <label className="block mb-2 font-medium">Draft Proposal (PDF)</label>
            <input type="file" accept="application/pdf" onChange={(e) => setProposal(e.target.files?.[0] || null)} />
            {proposal && <embed src={URL.createObjectURL(proposal)} className="mt-2 w-full h-40" />}
          </div>
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Submit
        </button>

        {uploadSuccess && (
          <p className="text-green-600 mt-4 font-semibold">Upload successful! 🎉</p>
        )}
      </form>
    </div>
  );
}
