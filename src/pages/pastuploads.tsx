import { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import Link from 'next/link';

type UploadEntry = {
  _id: string;
  filename: string;
  url: string;
  uploadedAt: string;
};

export default function PastUploads() {
  const { user } = useUser();
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchUploads = async () => {
      const res = await fetch('/api/uploads');
      const data = await res.json();
      setUploads(data);
    };
    fetchUploads();
  }, []);

  const filteredUploads = uploads.filter((file) =>
    file.filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white text-blue-900">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-4 shadow-md">
        <Link href="/" className="text-lg font-semibold">Home</Link>
        <div className="space-x-4">
          <Link href="/upload">Upload</Link>
          {user && (
            <Link href="/api/auth/logout" passHref legacyBehavior>
              <a className="text-red-600 font-semibold">Sign Out</a>
            </Link>
          )}
        </div>
      </nav>

      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Your Past Uploads</h1>

        <input
          type="text"
          placeholder="Search by filename..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 px-4 py-2 border border-gray-300 rounded w-full"
        />

        {filteredUploads.length === 0 ? (
          <p>No uploads found.</p>
        ) : (
          <ul className="space-y-3">
            {filteredUploads.map((file) => (
              <li key={file._id} className="flex justify-between items-center border-b pb-2">
                <span>{file.filename}</span>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  View
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
