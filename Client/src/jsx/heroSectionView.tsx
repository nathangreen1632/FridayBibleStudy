// Client/src/jsx/heroSectionView.tsx
import React from "react";
import { Link } from "react-router-dom";

export default function HeroSectionView(): React.ReactElement {
  return (
    <section className="text-center py-6 sm:py-10 px-3 sm:px-6 bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 text-[var(--theme-accent)] leading-tight">
        Friday Night Bible Study
      </h2>
      <p className="text-sm sm:text-base md:text-lg mb-6 sm:mb-8 text-[var(--theme-text)]/80 max-w-xl sm:max-w-2xl mx-auto leading-relaxed">
        A place to share prayer requests and praises, stay connected with the group,
        and grow together in faith.
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
        <Link
          to="/portal"
          className="inline-block w-full sm:w-auto text-center px-5 sm:px-6 py-2.5 sm:py-3 border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] rounded-xl font-medium hover:bg-[var(--theme-card-hover)] transition focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]/30"
        >
          Login to Portal
        </Link>
        <Link
          to="/register"
          className="inline-block w-full sm:w-auto text-center px-5 sm:px-6 py-2.5 sm:py-3 border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] rounded-xl font-medium hover:bg-[var(--theme-card-hover)] transition focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]/30"
        >
          Create Account
        </Link>
      </div>
    </section>
  );
}
