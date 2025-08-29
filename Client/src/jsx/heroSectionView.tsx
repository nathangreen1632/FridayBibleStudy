import React from "react";
import { Link } from "react-router-dom";

export default function HeroSectionView(): React.ReactElement {
  return (
    <section className="text-center py-8 px-4 bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-[var(--theme-accent)]">
        Friday Night Bible Study
      </h2>
      <p className="text-lg mb-8 text-[var(--theme-text)]/80 max-w-2xl mx-auto">
        A place to share prayer requests and praises, stay connected with the group,
        and grow together in faith.
      </p>
      <div className="flex justify-center gap-4 flex-wrap">
        <Link
          to="/portal"
          className="inline-block px-6 py-3 border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] rounded-xl font-medium hover:bg-[var(--theme-card-hover)] transition focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]/30"
        >
          Login to Portal
        </Link>
        <Link
          to="/register"
          className="inline-block px-6 py-3 border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] rounded-xl font-medium hover:bg-[var(--theme-card-hover)] transition focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]/30"
        >
          Create Account
        </Link>
      </div>
    </section>
  );
}
