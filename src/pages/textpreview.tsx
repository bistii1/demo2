// pages/textpreview.tsx
import { useEffect, useState } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import Link from "next/link";

interface ComplianceResponse {
  annotated: string;
  corrected: string;
}

interface Upload {
  _id: string;
  draftText: string;
  guidelinesText: string;
  createdAt: string;
}

interface BudgetItem {
  role: string;
  name: string;
  effort: number;
  salary: number;
  fringe: number;
  category: string;
  notes: string;
}

export default function TextPreviewPage() {
  const { user } = useUser();
  const [latest, setLatest] = useState<Upload | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [annotatedHtml, setAnnotatedHtml] = useState<string>("");
  const [correctedHtml, setCorrectedHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [budget, setBudget] = useState<BudgetItem[]>([]);

  useEffect(() => {
    async function fetchUploads() {
      if (!user) return;

      const res = await fetch("/api/getParsedText");
      const data: { uploads: Upload[] } = await res.json();

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

    try {
      const res = await fetch("/api/annotateCompliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: latest.draftText,
          guidelines: latest.guidelinesText,
        }),
      });

      if (!res.ok) {
        throw new Error("Compliance check failed");
      }

      const data = await res.json();
      setAnnotatedHtml(data.annotated);
      setCorrectedHtml(data.corrected);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while checking compliance.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRow = () => {
    setBudget((prev) => [
      ...prev,
      {
        role: "",
        name: "",
        effort: 0,
        salary: 0,
        fringe: 0,
        category: "",
        notes: "",
      },
    ]);
  };

  const handleBudgetChange = <K extends keyof BudgetItem>(
    index: number,
    field: K,
    value: BudgetItem[K]
  ) => {
    const updated = [...budget];
    updated[index][field] = value;
    setBudget(updated);
  };

  const total = budget.reduce(
    (sum, item) => sum + (item.salary * item.effort) / 100 + item.fringe,
    0
  );

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
              {error && <p className="text-red-600 mt-2 font-semibold">{error}</p>}
            </div>

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

            <div className="bg-white/90 text-black p-6 border border-gray-200 rounded-2xl shadow mb-10">
              <h2 className="text-xl font-bold mb-4 text-blue-900">Build Your Budget</h2>
              <table className="w-full mb-4 border text-sm rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-2 py-1">Role</th>
                    <th className="border px-2 py-1">Name</th>
                    <th className="border px-2 py-1">% Effort</th>
                    <th className="border px-2 py-1">Salary</th>
                    <th className="border px-2 py-1">Fringe</th>
                    <th className="border px-2 py-1">Category</th>
                    <th className="border px-2 py-1">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {budget.map((item, idx) => (
                    <tr key={idx} className="hover:bg-blue-50">
                      {(Object.keys(item) as (keyof BudgetItem)[]).map((key) => (
                        <td key={String(key)} className="border px-2 py-1">
                          <input
                            className="w-full border border-gray-300 rounded px-1 py-0.5 focus:ring-2 focus:ring-blue-300 transition"
                            type={typeof item[key] === "number" ? "number" : "text"}
                            value={item[key] as string | number}
                            onChange={(e) =>
                              handleBudgetChange(
                                idx,
                                key,
                                typeof item[key] === "number"
                                  ? Number(e.target.value)
                                  : (e.target.value as BudgetItem[typeof key])
                              )
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between">
                <button
                  onClick={handleAddRow}
                  className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600 shadow transition mb-2"
                >
                  + Add Row
                </button>
                <p className="font-semibold text-lg">Total: ${total.toFixed(2)}</p>
              </div>
            </div>
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
