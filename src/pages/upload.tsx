import { useState } from 'react';
import Link from 'next/link';

export default function UploadPage() {
  const [guidelines, setGuidelines] = useState<File | null>(null);
  const [draft, setDraft] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!guidelines || !draft) {
      alert("Please upload both files.");
      return;
    }

    const formData = new FormData();
    formData.append("guidelines", guidelines);
    formData.append("draft", draft);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    alert(data.message);
  };

  return (
    <div className="min-h-screen bg-blue-900 text-white flex flex-col items-center justify-center space-y-6 p-8">
      <h1 className="text-3xl font-bold mb-4">Upload your PDF files</h1>

      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        <div>
          <label className="block mb-1">Research Proposal Guidelines (PDF)</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setGuidelines(e.target.files?.[0] || null)}
            className="text-black"
          />
        </div>

        <div>
          <label className="block mb-1">Draft Proposal (PDF)</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setDraft(e.target.files?.[0] || null)}
            className="text-black"
          />
        </div>

        <button
          type="submit"
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
        >
          Upload
        </button>
      </form>

      <Link
        href="/api/auth/logout?returnTo=/"
        className="mt-6 bg-red-600 px-4 py-2 rounded-lg shadow hover:bg-red-700 transition"
      >
        Home (Sign Out)
      </Link>
    </div>
  );
}
