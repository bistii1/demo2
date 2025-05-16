import { useState } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import Link from "next/link";

export default function UploadPage() {
  const { user } = useUser();
  const [guidelinesFile, setGuidelinesFile] = useState<File | null>(null);
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guidelinesFile || !draftFile) return;

    const formData = new FormData();
    formData.append("guidelines", guidelinesFile);
    formData.append("draft", draftFile);
    if (user?.email) formData.append("email", user.email);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) setSuccess(true);
  };

  return (
    <div className="min-h-screen bg-white text-blue-900">
      {/* Nav Bar */}
      <nav className="flex justify-between items-center p-4 shadow-md bg-white">
        <Link href="/" className="text-lg font-semibold text-blue-900">Home</Link>
        {user && (
          <a href="/api/auth/logout" className="text-red-600 font-semibold">Sign Out</a>
        )}
      </nav>

      {/* Upload Section */}
      <main className="flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold mb-8">Upload your PDF files</h1>

        <form onSubmit={handleSubmit} className="flex flex-col items-center">
          <div className="flex gap-10 mb-6">
            {/* Guidelines */}
            <div className="w-64">
              <label className="block mb-2 font-medium text-gray-900">Research Proposal Guidelines (PDF)</label>
              <input
                type="file"
                accept="application/pdf"
                className="text-gray-900"
                onChange={(e) => setGuidelinesFile(e.target.files?.[0] || null)}
              />
              {guidelinesFile && (
                <embed src={URL.createObjectURL(guidelinesFile)} className="mt-2 w-full h-40 border" />
              )}
            </div>

            {/* Draft */}
            <div className="w-64">
              <label className="block mb-2 font-medium text-gray-900">Draft Proposal (PDF)</label>
              <input
                type="file"
                accept="application/pdf"
                className="text-gray-900"
                onChange={(e) => setDraftFile(e.target.files?.[0] || null)}
              />
              {draftFile && (
                <embed src={URL.createObjectURL(draftFile)} className="mt-2 w-full h-40 border" />
              )}
            </div>
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Submit
          </button>

          {success && (
            <p className="text-green-600 mt-4 font-semibold">Upload successful! 🎉</p>
          )}
        </form>
      </main>
    </div>
  );
}
