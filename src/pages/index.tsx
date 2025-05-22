'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 p-8 font-sans">
      {/* Animated Heading */}
      <h1 className="text-5xl md:text-6xl font-extrabold mb-10 text-center text-white animate-fade-in-scale drop-shadow-lg tracking-tight">
        Welcome to Proposal Edge
      </h1>

      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6">
        <button
          onClick={() => router.push('/upload')}
          className="bg-white text-blue-700 font-semibold px-8 py-3 rounded-xl shadow-lg hover:bg-blue-100 transition-all duration-200 text-lg"
        >
          Start Now
        </button>

        <Link
          href="/api/auth/login?returnTo=/upload&prompt=login"
          className="bg-indigo-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:bg-indigo-800 transition-all duration-200 text-lg"
        >
          Login / Sign Up
        </Link>
      </div>

      {/* Custom styles for animation and font */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        html {
          font-family: 'Inter', sans-serif;
        }
        .animate-fade-in-scale {
          opacity: 0;
          transform: scale(0.95);
          animation: fadeInScale 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes fadeInScale {
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </main>
  );
}
