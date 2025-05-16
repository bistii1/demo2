'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const handleLogin = () => {
    // Manually redirect to the Auth0 login endpoint
    window.location.href = '/api/auth/login?returnTo=/upload&prompt=login';
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-blue-500 p-8">
      <h1 className="text-4xl font-bold mb-8 text-center text-white">
        Welcome to Proposal Edge
      </h1>

      <div className="flex space-x-4">
        <button
          onClick={() => router.push('/upload')}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition"
        >
          Start Now
        </button>

        <a
          href="http://localhost:3000/api/auth/login?returnTo=/upload&prompt=login"
          className="bg-gray-800 text-white px-6 py-3 rounded-lg shadow hover:bg-gray-900 transition"
        >
          Login / Sign Up
        </a>

      </div>
    </main>
  );
}
