import { useEffect, useState } from 'react';
import Link from 'next/link';

type Upload = {
  id: string;
  filename: string;
  url: string;
};

export default function PastUploads() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchUploads = async () => {
      const res = await fetch('/api/pastuploads');
      const data = await res.json();
      setUploads(data);
    };
    fetchUploads();
  }, []);

  const filtered = uploads.filter((upload) =>
    upload.filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white text-blue-900">
      <nav className="flex justify-between items-center p-4 shadow-md">
        <Link href="/" className="text-lg font-semibold">Home</Link>
        <div className="space-x-4">
          <Link href="/upload">Upload</Link>
          <a href="/api/auth/logout" className="text-red-600 font-semibold">Sign Out</a>
        </div>
      </nav>

      <main className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Your Past Uploads</h1>

        <input
          type="text"
          placeholder="Search by filename..."
          className="w-full border border-gray-300 px-4 py-2 mb-6 rounded"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <ul className="space-y-4">
          {filtered.map((upload) => (
            <li key={upload.id} className="flex justify-between items-center border-b pb-2">
              <span>{upload.filename}</span>
              <a
                href={upload.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                View
              </a>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
