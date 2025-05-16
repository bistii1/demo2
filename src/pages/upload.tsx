// pages/upload.tsx
import { useState } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { Document, Page, pdfjs } from "react-pdf";
import Link from "next/link";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function Upload() {
  const { user } = useUser();
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [preview1, setPreview1] = useState<string | null>(null);
  const [preview2, setPreview2] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
    setPreview: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
    if (selectedFile) {
      setPreview(URL.createObjectURL(selectedFile));
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file1 || !file2) return;

    const formData = new FormData();
    formData.append("file1", file1);
    formData.append("file2", file2);
    if (user?.email) formData.append("userEmail", user.email);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      setSuccessMessage("Your PDFs were uploaded successfully!");
      setFile1(null);
      setFile2(null);
      setPreview1(null);
      setPreview2(null);
    } else {
      setSuccessMessage("Upload failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="flex justify-between items-center p-4 shadow-md bg-white">
        <Link href="/" className="text-lg font-semibold text-blue-900">Home</Link>
        {user && (
          <Link href="/api/auth/logout" legacyBehavior>
            <a className="text-red-600 font-semibold">Sign Out</a>
          </Link>
        )}
      </nav>

      <div className="max-w-6xl mx-auto mt-10 bg-white p-8 rounded-xl shadow">
        <h1 className="text-3xl font-bold text-center text-blue-900 mb-10">Upload Your PDF Files</h1>
        
        {successMessage && (
          <div className="mb-6 text-center text-green-600 font-medium">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <label className="block text-xl font-semibold text-blue-900 mb-2">
                Proposal Guidelines (PDF)
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => handleFileChange(e, setFile1, setPreview1)}
                className="w-full border border-gray-300 rounded px-4 py-2 text-gray-800"
              />
              {preview1 && (
                <div className="mt-4 border-2 border-gray-700 rounded overflow-hidden">
                  <Document file={preview1}>
                    <Page pageNumber={1} width={400} />
                  </Document>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xl font-semibold text-blue-900 mb-2">
                Draft Proposal (PDF)
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => handleFileChange(e, setFile2, setPreview2)}
                className="w-full border border-gray-300 rounded px-4 py-2 text-gray-800"
              />
              {preview2 && (
                <div className="mt-4 border-2 border-gray-700 rounded overflow-hidden">
                  <Document file={preview2}>
                    <Page pageNumber={1} width={400} />
                  </Document>
                </div>
              )}
            </div>
          </div>

          <div className="text-center mt-10">
            <button
              type="submit"
              className="bg-blue-600 text-white font-semibold px-6 py-3 rounded hover:bg-blue-700 transition"
            >
              Submit PDFs
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
