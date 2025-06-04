import { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import * as XLSX from 'xlsx';

export default function GenerateBudgetPage() {
  const [draftNotes, setDraftNotes] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [loadingDraft, setLoadingDraft] = useState<boolean>(true);
  const [xlsmFile, setXlsmFile] = useState<File | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [processingTabs, setProcessingTabs] = useState<boolean>(false);

  // New state for sheet names and selected tab
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>('');

  // When user selects a file, parse it to get sheet names
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setXlsmFile(file);
    setDownloadUrl(null);

    if (!file) {
      setSheetNames([]);
      setSelectedTab('');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      if (!data) return;

      const workbook = XLSX.read(data, { type: 'array' });
      setSheetNames(workbook.SheetNames);
      setSelectedTab(workbook.SheetNames[0] || '');
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleFileUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!xlsmFile || !draftNotes) {
      alert('Missing file or draft notes');
      return;
    }
    if (!selectedTab) {
      alert('Please select a tab');
      return;
    }

    try {
      setError('');
      setProcessingTabs(true);
      setDownloadUrl(null);

      const formData = new FormData();
      formData.append('file', xlsmFile);
      formData.append('draftNotes', draftNotes);
      formData.append('tabName', selectedTab);

      const res = await fetch('/api/generate-filled-budget', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const fallback = await res.text();
        throw new Error(fallback || 'Failed to generate filled Excel');
      }

      const json = await res.json();
      const base64Xlsm: string = json.base64Xlsm;

      const byteCharacters = atob(base64Xlsm);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      const blob = new Blob([byteArray], {
        type: 'application/vnd.ms-excel.sheet.macroEnabled.12',
      });

      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error generating filled Excel';
      setError(message);
    } finally {
      setProcessingTabs(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-800 p-10">
      {/* ... draftNotes loading UI (unchanged) ... */}

      {/* ... Your existing draftNotes display and loading logic ... */}

      <h2 className="text-2xl font-semibold mb-4 text-indigo-700">Step 2: Upload Budget Template</h2>
      <form onSubmit={handleFileUpload} className="mb-6">
        <input
          name="file"
          type="file"
          accept=".xlsm"
          onChange={handleFileChange}
          className="mb-4 block"
          disabled={processingTabs || loadingDraft}
        />

        {sheetNames.length > 0 && (
          <label className="block mb-4">
            <span className="block mb-1 font-medium text-indigo-700">Select Sheet Tab to Fill:</span>
            <select
              value={selectedTab}
              onChange={(e) => setSelectedTab(e.target.value)}
              className="border rounded px-3 py-2 w-full"
              disabled={processingTabs || loadingDraft}
            >
              {sheetNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          disabled={!xlsmFile || !selectedTab || processingTabs || loadingDraft}
        >
          {processingTabs ? `Filling Excel Template...` : 'Generate Budget Sheet'}
        </button>
      </form>

      {downloadUrl && (
        <div className="bg-green-50 p-4 rounded shadow border border-green-300">
          <p className="text-green-700 font-medium mb-2">Your filled budget sheet is ready:</p>
          <a
            href={downloadUrl}
            download="filled_budget.xlsm"
            className="text-blue-700 underline hover:text-blue-900"
          >
            Download Excel File
          </a>
        </div>
      )}
    </div>
  );
}
