// pages/pastuploads.tsx
import { useUser } from '@auth0/nextjs-auth0/client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type UploadEntry = {
  _id: string;
  userId: string;
  guidelinesUrl: string;
  proposalUrl: string;
  uploadedAt: string;
};

export default function PastUploads() {
  const { user, isLoading } = useUser();
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    fetch(`/api/uploads?user=${user.sub}`)
      .then(res => res.json())
      .then(data => setUploads(data));
  }, [user]);

  const filtered = uploads.filter(upload =>
    upload.uploadedAt.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-white text-blue-900">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-4 shadow-md">
        <Link href="/" className="text-lg font-semibold">Home</Link>
        <div className="space-x-4">
          <Link href="/upload">Upload</Link>
          {user && (
            <Link href="/api/auth/logout" legacyBehavior>
              <a className="text-red-600 font-semibold">Sign Out</a>
            </Link>
          )}
        </div>
      </nav>

      {/* Page Content */}
      <main className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Past Uploads</h1>

        <input
          type="text"
          placeholder="Search by upload date..."
          className="mb-6 p-2 border border-gray-300 rounded w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <ul className="space-y-4">
          {filtered.map((upload) => (
            <li key={upload._id} className="p-4 border rounded shadow-sm bg-gray-50">
              <p className="text-sm text-gray-600 mb-2">Uploaded: {new Date(upload.uploadedAt).toLocaleString()}</p>
              <div className="space-x-4">
                <a href={upload.guidelinesUrl} target="_blank" className="text-blue-600 underline">View Guidelines</a>
                <a href={upload.proposalUrl} target="_blank" className="text-blue-600 underline">View Proposal</a>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
