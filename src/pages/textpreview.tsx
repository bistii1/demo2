import { useEffect, useState } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import Link from "next/link";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [budget, setBudget] = useState<BudgetItem[]>([]);

  useEffect(() => {
    async function fetchUploads() {
      if (!user) return;

      const res = await fetch("/api/getParsedText");
      const data = await res.json();

      const sorted = data.uploads
        .filter((u: Upload) => u.draftText || u.guidelinesText)
        .sort((a: Upload, b: Upload) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

  const handleBudgetChange = <K extends keyof BudgetItem>(index: number, field: K, value: BudgetItem[K]) => {
    const updated = [...budget];
    updated[index][field] = value;
    setBudget(updated);
  };

  const total = budget.reduce((sum, item) => sum + (item.salary * item.effort) / 100 + item.fringe, 0);

  return (
    <div style={{ background: "#fff", color: "#000", minHeight: "100vh", padding: "2rem" }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: "bold", marginBottom: "1rem" }}>Text Extract Preview</h1>

      {latest ? (
        <>
          <section style={{ marginBottom: "2rem" }}>
            <h2 style={{ color: "#1d4ed8" }}>Draft Text</h2>
            <div
              style={{
                border: "1px solid #ccc",
                padding: "1rem",
                borderRadius: "8px",
                whiteSpace: "pre-wrap",
                background: "#f9f9f9",
                maxHeight: "300px",
                overflowY: "auto",
              }}
            >
              {latest.draftText}
            </div>
          </section>

          <section style={{ marginBottom: "2rem" }}>
            <h2 style={{ color: "#15803d" }}>Guidelines Text</h2>
            <div
              style={{
                border: "1px solid #ccc",
                padding: "1rem",
                borderRadius: "8px",
                whiteSpace: "pre-wrap",
                background: "#f9f9f9",
                maxHeight: "300px",
                overflowY: "auto",
              }}
            >
              {latest.guidelinesText}
            </div>
          </section>

          <button
            onClick={handleCheckCompliance}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 mb-4"
            disabled={loading}
          >
            {loading ? "Checking..." : "Check Compliance"}
          </button>

          {error && <p className="text-red-500">{error}</p>}

          {annotatedHtml && (
            <section style={{ marginTop: "2rem" }}>
              <h2 style={{ color: "#dc2626", marginBottom: "0.5rem" }}>
                Annotated Draft (Compliance Highlights)
              </h2>
              <div
                style={{
                  border: "1px solid #ccc",
                  padding: "1rem",
                  borderRadius: "8px",
                  background: "#fff0f0",
                  maxHeight: "400px",
                  overflowY: "auto",
                }}
                dangerouslySetInnerHTML={{ __html: annotatedHtml }}
              />
            </section>
          )}

          <div className="bg-white text-black p-6 border rounded mt-8">
            <h2 className="text-xl font-bold mb-4">Build Your Budget</h2>
            <table className="w-full mb-4 border text-sm">
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
                  <tr key={idx}>
                    {(Object.keys(item) as (keyof BudgetItem)[]).map((key) => (
                      <td key={String(key)} className="border px-2 py-1">
                        <input
                          className="w-full border px-1 py-0.5"
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
            <button
              onClick={handleAddRow}
              className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600 mb-2"
            >
              + Add Row
            </button>
            <p className="font-semibold">Total: ${total.toFixed(2)}</p>
          </div>
        </>
      ) : (
        <p>No uploads found.</p>
      )}

      {uploads.length > 1 && (
        <section>
          <h2 style={{ fontSize: "1.2rem", fontWeight: "bold", marginTop: "2rem" }}>Past Uploads</h2>
          <ul style={{ marginTop: "1rem" }}>
            {uploads.slice(1).map((upload) => (
              <li key={upload._id}>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2563eb",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                  onClick={() => {
                    setLatest(upload);
                    setAnnotatedHtml("");
                  }}
                >
                  View Upload from {new Date(upload.createdAt).toLocaleString()}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link href="/upload" style={{ display: "block", marginTop: "2rem", color: "#2563eb" }}>
        ← Back to Uploads
      </Link>
    </div>
  );
}
