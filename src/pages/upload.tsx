import { useState } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";

export default function UploadPage() {
  const { user } = useUser();
  const [guidelinesFile, setGuidelinesFile] = useState<File | null>(null);
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [success, setSuccess] = useState(false);
  const [guidelinesPreview, setGuidelinesPreview] = useState<string | null>(null);
  const [draftPreview, setDraftPreview] = useState<string | null>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<File | null>>,
    previewSetter: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setter(file);
      previewSetter(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guidelinesFile || !draftFile) return;

    const formData = new FormData();
    formData.append("guidelines", guidelinesFile);
    formData.append("draft", draftFile);
    if (user?.email) formData.append("email", user.email);

    await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    setSuccess(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-5xl">
        <h1 className="text-3xl font-bold text-center text-blue-900 mb-8">Upload Your PDF Files</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold text-blue-900 mb-2">Proposal Guidelines (PDF)</h2>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => handleFileChange(e, setGuidelinesFile, setGuidelinesPreview)}
                className="border rounded-md w-full px-3 py-2"
              />
              {guidelinesPreview && (
                <iframe
                  src={guidelinesPreview}
                  className="mt-4 w-full h-64 border-2 border-black"
                />
              )}
            </div>

            <div>
              <h2 className="text-xl font-semibold text-blue-900 mb-2">Draft Proposal (PDF)</h2>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => handleFileChange(e, setDraftFile, setDraftPreview)}
                className="border rounded-md w-full px-3 py-2"
              />
              {draftPreview && (
                <iframe
                  src={draftPreview}
                  className="mt-4 w-full h-64 border-2 border-black"
                />
              )}
            </div>
          </div>

          <div className="text-center">
            <button
              type="submit"
              className="bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition"
            >
              Submit PDFs
            </button>
            {success && <p className="mt-3 text-green-600 font-medium">Upload successful!</p>}
          </div>
        </form>
      </div>
    </div>
  );
}
