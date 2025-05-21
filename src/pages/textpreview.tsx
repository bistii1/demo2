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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  console.log("Sending draft/guidelines to compliance API");
  console.log("Draft preview:", latest.draftText.slice(0, 200));
  console.log("Guidelines preview:", latest.guidelinesText.slice(0, 200));

  try {
    const res = await fetch("/api/annotateCompliance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draft: latest.draftText,
        guidelines: latest.guidelinesText,
      }),
    });

    console.log("API response status:", res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error("API error body:", errorText);
      throw new Error("Compliance check failed");
    }

    const data = await res.json();
    console.log("API response body:", data);
    setAnnotatedHtml(data.annotated);
  } catch (err) {
    console.error("Client-side error:", err);
    setError("Something went wrong while checking compliance.");
  } finally {
    setLoading(false);
  }
};

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
