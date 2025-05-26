// pages/textpreview.tsx
import { useEffect, useState } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import Link from "next/link";

interface Upload {
  _id: string;
  draftText: string;
  guidelinesText: string;
  createdAt: string;
}

export default function TextPreviewPage() {
  const { user } = useUser();
  const [latest, setLatest] = useState<Upload | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [annotatedHtml, setAnnotatedHtml] = useState<string>("");
  const [correctedHtml, setCorrectedHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 0 });
  const [estimatedSeconds, setEstimatedSeconds] = useState(0);

  useEffect(() => {
    async function fetchUploads() {
      if (!user) return;
      const res = await fetch("/api/getParsedText");
      const data = await res.json();

      const sorted = data.uploads
        .filter((u: Upload) => u.draftText || u.guidelinesText)
        .sort(
          (a: Upload, b: Upload) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      setUploads(sorted);
      if (sorted.length > 0) {
        setLatest(sorted[0]);
      }
    }

    fetchUploads();
  }, [user]);

  const handleCheckCompliance = async () => {
    if (!latest) return;

    setLoading(true);
    setError("");
    setAnnotatedHtml("");
    setCorrectedHtml("");
    setChunkProgress({ current: 0, total: 0 });

    try {
      const CHUNK_SIZE = 6000;
      const draft = latest.draftText;
      const chunks = [];

      for (let i = 0; i < draft.length; i += CHUNK_SIZE) {
        chunks.push(draft.slice(i, i + CHUNK_SIZE));
      }

      setChunkProgress({ current: 0, total: chunks.length });
      setEstimatedSeconds(chunks.length * 6);

      let annotatedAll = "";
      let correctedAll = "";

      for (let i = 0; i < chunks.length; i++) {
        setChunkProgress({ current: i + 1, total: chunks.length });
        setEstimatedSeconds((chunks.length - (i + 1)) * 6);

        const res = await fetch("/api/annotateCompliance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draft: chunks[i] }),
        });

        if (!res.ok) throw new Error("Compliance check failed");

        const data = await res.json();
        annotatedAll += data.annotatedHtml;
        correctedAll += data.correctedHtml;
      }

      setAnnotatedHtml(annotatedAll);
      setCorrectedHtml(correctedAll);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while checking compliance.");
    } finally {
      setLoading(false);
      setChunkProgress({ current: 0, total: 0 });
      setEstimatedSeconds(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-100 to-blue-200 py-10 px-2 font-sans">
      <div className="max-w-4xl mx-auto bg-white/95 rounded-3xl shadow-2xl p-8 md:p-12">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-8 text-center text-indigo-800 tracking-tight">
          Text Extract Preview
        </h1>

        {latest ? (
          <>
            <section className="mb-8">
              <h2 className="text-xl font-bold text-blue-700 mb-2">Draft Text</h2>
              <div className="border border-gray-200 rounded-xl bg-gray-50 p-4 max-h-64 overflow-y-auto shadow-inner whitespace-pre-wrap text-gray-800">
                {latest.draftText}
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-green-700 mb-2">Guidelines Text</h2>
              <div className="border border-gray-200 rounded-xl bg-gray-50 p-4 max-h-64 overflow-y-auto shadow-inner whitespace-pre-wrap text-gray-800">
                {latest.guidelinesText}
              </div>
            </section>

            <div className="flex flex-col items-center mb-6">
              <button
                onClick={handleCheckCompliance}
                className="bg-gradient-to-r from-red-600 to-pink-500 text-white px-6 py-2 rounded-xl shadow-lg font-semibold text-lg hover:from-red-700 hover:to-pink-600 transition-all duration-200 mb-2"
                disabled={loading}
              >
                {loading ? "Checking..." : "Check Compliance"}
              </button>
              {chunkProgress.total > 0 && (
                <div className="text-sm text-gray-700 mb-2">
                  Processing chunk {chunkProgress.current} of {chunkProgress.total}
                  <br />
                  Estimated time remaining: ~{estimatedSeconds}s
                </div>
              )}
              {error && <p className="text-red-600 mt-2 font-semibold">{error}</p>}
            </div>

            {correctedHtml && (
              <section className="mb-10">
                <h2 className="text-lg font-bold text-indigo-700 mb-2">
                  Corrected Draft (Auto-Filled)
                </h2>
                <div
                  className="border border-indigo-200 rounded-xl bg-indigo-50 p-4 max-h-96 overflow-y-auto shadow-inner whitespace-pre-wrap text-gray-900"
                  dangerouslySetInnerHTML={{ __html: correctedHtml }}
                />
              </section>
            )}

            {annotatedHtml && (
              <section className="mb-10">
                <h2 className="text-lg font-bold text-red-700 mb-2">
                  Annotated Draft (Compliance Highlights)
                </h2>
                <div
                  className="border border-red-200 rounded-xl bg-red-50 p-4 max-h-96 overflow-y-auto shadow-inner whitespace-pre-wrap text-gray-900"
                  dangerouslySetInnerHTML={{ __html: annotatedHtml }}
                />
              </section>
            )}
          </>
        ) : (
          <p className="text-center text-gray-600">No uploads found.</p>
        )}

        {uploads.length > 1 && (
          <section>
            <h2 className="text-lg font-bold text-indigo-700 mt-8 mb-2">Past Uploads</h2>
            <ul className="space-y-2">
              {uploads.slice(1).map((upload) => (
                <li key={upload._id}>
                  <button
                    className="text-blue-700 hover:underline font-medium"
                    onClick={() => {
                      setLatest(upload);
                      setAnnotatedHtml("");
                      setCorrectedHtml("");
                    }}
                  >
                    View Upload from {new Date(upload.createdAt).toLocaleString()}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Link
          href="/upload"
          className="block mt-10 text-blue-600 hover:underline text-center font-semibold text-lg"
        >
          ← Back to Uploads
        </Link>
      </div>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        html {
          font-family: 'Inter', sans-serif;
        }
      `}</style>
    </div>
  );
}
