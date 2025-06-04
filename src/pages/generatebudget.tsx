// pages/generatebudget.tsx
import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import * as XLSX from 'xlsx';

export default function GenerateBudgetPage() {
  const [xlsmFile, setXlsmFile] = useState<File | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [processingTabs, setProcessingTabs] = useState<boolean>(false);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>('');
  const [draftNotes, setDraftNotes] = useState<string>('');
  const [loadingNotes, setLoadingNotes] = useState<boolean>(true);

  useEffect(() => {
    // Auto-fetch AI-generated budget notes from backend
    async function fetchDraftNotes() {
      try {
        const res = await fetch('/api/generate-budget?chunkIndex=all');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to fetch draft notes');
        setDraftNotes(json.draftNotes);
      } catch (err) {
        console.error(err);
        alert('Could not fetch draft notes');
      } finally {
        setLoadingNotes(false);
      }
    }

    fetchDraftNotes();
  }, []);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setXlsmFile(file);
    setDownloadUrl(null); // clear any previous download link

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      setSheetNames(workbook.SheetNames);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!xlsmFile || !selectedTab) {
      alert('Please upload a file and select a sheet');
      return;
    }

    const formData = new FormData();
    formData.append('xlsmFile', xlsmFile);
    formData.append('draftNotes', draftNotes);
    formData.append('selectedTab', selectedTab);

    setProcessingTabs(true);
    try {
      const res = await fetch('/api/generate-filled-budget', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to generate Excel file');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);
    } catch (error) {
      console.error('Error generating Excel file:', error);
      alert('Failed to generate Excel file.');
    } finally {
      setProcessingTabs(false);
    }
  };

  if (loadingNotes) {
    return <div className="p-10 text-gray-600">Loading budget-relevant draft notes...</div>;
  }

  if (!draftNotes) {
    return <div className="p-10 text-red-600">Could not load budget notes from your latest upload.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-6">Generate PAMS Budget</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-medium mb-2">Upload PAMS-style Excel Template (.xlsm)</label>
          <input
            type="file"
            accept=".xlsm"
            onChange={handleFileUpload}
            className="block w-full border border-gray-300 rounded p-2"
          />
        </div>

        {sheetNames.length > 0 && (
          <div>
            <label className="block font-medium mb-2">Select Sheet to Edit</label>
            <select
              value={selectedTab}
              onChange={(e) => setSelectedTab(e.target.value)}
              className="w-full border border-gray-300 rounded p-2"
            >
              <option value="">-- Select a sheet --</option>
              {sheetNames.map((sheet) => (
                <option key={sheet} value={sheet}>
                  {sheet}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={processingTabs}
        >
          {processingTabs ? 'Processing...' : 'Generate Filled Excel'}
        </button>
      </form>

      {downloadUrl && (
        <div className="mt-6">
          <a
            href={downloadUrl}
            download="filled-budget.xlsm"
            className="text-blue-600 underline"
          >
            Download Filled Excel File
          </a>
        </div>
      )}
    </div>
  );
}
