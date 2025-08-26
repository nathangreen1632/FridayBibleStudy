import React from 'react';
import { Link } from 'react-router-dom';

export default function Home(): React.ReactElement {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Friday Night Bible Study</h1>

      <p className="opacity-80">
        Welcome! This is the client scaffold (React + Vite + TypeScript). Use the links below to
        explore the app while we build out the features.
      </p>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/portal"
          className="px-4 py-2 rounded-md border border-white/20 hover:border-white/40"
          aria-label="Open your portal board"
        >
          Open Portal Board
        </Link>

        <Link
          to="/register"
          className="px-4 py-2 rounded-md border border-white/20 hover:border-white/40"
          aria-label="Create an account"
        >
          Create Account
        </Link>

        <a
          href="/api/health"
          className="px-4 py-2 rounded-md border border-white/20 hover:border-white/40"
          aria-label="Check API health"
        >
          API Health
        </a>
      </div>
    </section>
  );
}
