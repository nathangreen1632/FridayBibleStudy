import React from 'react';
import { Link } from 'react-router-dom';

export default function Home(): React.ReactElement {
  return (
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <section className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-[0_4px_14px_0_var(--theme-shadow)] p-8 md:p-10 space-y-6">
          <h1 className="text-3xl font-bold text-[var(--theme-accent)]">
            Friday Night Bible Study
          </h1>

          <p className="opacity-80">
            Welcome! This is the client scaffold (React + Vite + TypeScript). Use the links below to
            explore the app while we build out the features.
          </p>

          <div className="flex flex-wrap gap-3">
            {/* Primary CTA */}
            <Link
              to="/portal"
              className="inline-flex items-center rounded-xl bg-[var(--theme-button)] px-4 py-2.5 text-[var(--theme-text-white)] font-semibold hover:bg-[var(--theme-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] focus:ring-offset-2 focus:ring-offset-[var(--theme-bg)]"
              aria-label="Open your portal board"
            >
              Open Portal Board
            </Link>

            {/* Secondary / outlined */}
            <Link
              to="/register"
              className="inline-flex items-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2.5 text-[var(--theme-text)] font-semibold hover:bg-[var(--theme-card-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] focus:ring-offset-2 focus:ring-offset-[var(--theme-bg)]"
              aria-label="Create an account"
            >
              Create Account
            </Link>

            {/* Neutral action */}
            <a
              href="/api/health"
              className="inline-flex items-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2.5 text-[var(--theme-text)] font-semibold hover:bg-[var(--theme-card-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] focus:ring-offset-2 focus:ring-offset-[var(--theme-bg)]"
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
