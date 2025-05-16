// pages/upload.tsx
import { useState } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

export default function Upload() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);

    const formData = new FormData();
    if (file1) formData.append('file1', file1);
    if (file2) formData.append('file2', file2);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        console.error('Upload failed');
      }
    } catch (error) {
      console.error('Error submitting PDFs:', error);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="bg-white p-10 rounded-2xl shadow-md w-full max-w-5xl">
        <h1 className="text-4xl font-bold text-center mb-8 text-blue-900">Upload Your PDF Files</h1>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xl font-semibold text-blue-900 mb-2">Proposal Guidelines (PDF)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile1(e.target.files?.[0] || null)}
                className="w-full p-2 border rounded-md"
              />
              {file1 && (
                <div className="border mt-4 p-2 rounded-lg">
                  <Document file={file1}>
                    <Page pageNumber={1} width={400} />
                  </Document>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xl font-semibold text-blue-900 mb-2">Draft Proposal (PDF)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile2(e.target.files?.[0] || null)}
                className="w-full p-2 border rounded-md"
              />
              {file2 && (
                <div className="border mt-4 p-2 rounded-lg">
                  <Document file={file2}>
                    <Page pageNumber={1} width={400} />
                  </Document>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center mt-8 space-y-2">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg hover:bg-blue-700 transition"
            >
              Submit PDFs
            </button>
            {success && <p className="text-green-600 text-sm mt-2">✅ Successfully uploaded!</p>}
          </div>
        </form>
      </div>
    </div>
  );
}
