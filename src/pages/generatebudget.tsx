// pages/generateBudget.tsx
import { useEffect, useState } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import Link from "next/link";

export default function GenerateBudgetPage() {
  const [proposalText, setProposalText] = useState("");
  const [budgetTable, setBudgetTable] = useState("");
  const [justification, setJustification] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchLatestProposal() {
      const res = await fetch("/api/getParsedText");
      const data = await res.json();
      const latest = data.uploads?.[0]?.draftText;
      if (latest) setProposalText(latest);
    }
    fetchLatestProposal();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setBudgetTable("");
    setJustification("");
    try {
      const res = await fetch("/api/generateBudget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalText }),
      });
      if (!res.ok) throw new Error("Failed to generate budget");
      const data = await res.json();
      setBudgetTable(data.budgetTable);
      setJustification(data.justification);
    } catch (err) {
      console.error(err);
      setError("Something went wrong generating the budget.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-100 to-blue-200 py-10 px-4 font-sans">
      <div className="max-w-4xl mx-auto bg-white/95 rounded-3xl shadow-xl p-8 md:p-12">
        <h1 className="text-3xl font-extrabold text-indigo-800 text-center mb-6">Generate Budget</h1>

        <section className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Proposal Text</h2>
          <div className="border rounded-xl p-4 bg-gray-50 shadow-inner max-h-64 overflow-y-auto whitespace-pre-wrap text-sm">
            {proposalText || "No proposal found."}
          </div>
        </section>

        <div className="flex justify-center mb-6">
          <button
            onClick={handleGenerate}
            className="bg-green-600 text-white px-6 py-2 rounded-xl shadow hover:bg-green-700 transition-all duration-200"
            disabled={loading || !proposalText}
          >
            {loading ? "Generating..." : "Generate Budget"}
          </button>
        </div>

        {error && <p className="text-red-600 text-center mb-4">{error}</p>}

        {budgetTable && (
          <section className="mb-6">
            <h2 className="text-lg font-bold text-blue-800 mb-2">Estimated Budget Table</h2>
            <div
              className="border rounded-xl bg-blue-50 p-4 shadow-inner overflow-x-auto text-sm"
              dangerouslySetInnerHTML={{ __html: budgetTable }}
            />
          </section>
        )}

        {justification && (
          <section>
            <h2 className="text-lg font-bold text-green-800 mb-2">Budget Justification</h2>
            <div className="border rounded-xl bg-green-50 p-4 shadow-inner text-sm whitespace-pre-wrap">
              {justification}
            </div>
          </section>
        )}

        <Link
          href="/upload"
          className="block mt-10 text-center text-blue-600 font-semibold hover:underline"
        >
          ← Back to Upload
        </Link>
      </div>
    </div>
  );
}
