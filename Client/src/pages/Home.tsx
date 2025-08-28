import React from 'react';
import { Link } from 'react-router-dom';

export default function Home(): React.ReactElement {
  return (
    <div className="min-h-screen bg-white">
      <section className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-8 md:p-10 space-y-6">
          <h1 className="text-3xl font-bold text-neutral-900">Friday Night Bible Study</h1>

          <p className="text-neutral-600">
            Welcome! This is the client scaffold (React + Vite + TypeScript). Use the links below to
            explore the app while we build out the features.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/portal"
              className="inline-flex items-center rounded-xl bg-neutral-900 px-4 py-2.5 text-white font-semibold hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900"
              aria-label="Open your portal board"
            >
              Open Portal Board
            </Link>

            <Link
              to="/register"
              className="inline-flex items-center rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-neutral-900 font-semibold hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900"
              aria-label="Create an account"
            >
              Create Account
            </Link>

            <a
              href="/api/health"
              className="inline-flex items-center rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-neutral-900 font-semibold hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900"
              aria-label="Check API health"
            >
              API Health
            </a>
          </div>
        </div>
      </section>
    </div>
  );

}
