import React from "react";
import { Link } from "react-router-dom";

export default function PhilosophyView(): React.ReactElement {
  return (
    <section className="pt-2 sm:pt-3 pb-3 sm:pb-5 px-3 sm:px-6 max-w-6xl mx-auto text-center text-[var(--theme-text)]">
      {/* Card container */}
      <div className="rounded-2xl sm:rounded-3xl overflow-hidden bg-[var(--theme-surface)] shadow-md md:shadow-[0_4px_14px_0_var(--theme-shadow)]">
        <div className="w-full h-[220px] sm:h-[360px] md:h-[480px] lg:h-[540px] xl:h-[600px] 2xl:h-[650px] overflow-hidden">
          <img
            src="/bible-study-banner.webp"
            alt="Friday Bible Study group banner"
            className="w-full h-full object-cover rounded-2xl sm:rounded-3xl"
          />
        </div>
        <div className="p-4 sm:p-6 bg-[var(--theme-surface)] text-left sm:text-center space-y-3">
          <p className="text-[var(--theme-text)]/90 text-sm sm:text-lg">
            Our Friday Bible Study is built on fellowship, prayer, and a heart
            to grow in the Word together.
          </p>
          <p className="text-[var(--theme-text)]/70 text-[13px] sm:text-base">
            Every prayer request matters. Every praise encourages.
            This is a community where faith and friendship thrive.
          </p>
        </div>
      </div>

      {/* Buttons under container */}
      <div className="mt-4 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
        <Link
          to="/portal"
          className="inline-block w-full sm:w-auto text-center px-5 sm:px-6 py-2.5 sm:py-3 border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] rounded-xl font-medium hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] transition focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]/30"
        >
          Login to Portal
        </Link>
        <Link
          to="/register"
          className="inline-block w-full sm:w-auto text-center px-5 sm:px-6 py-2.5 sm:py-3 border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] rounded-xl font-medium hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] transition focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]/30"
        >
          Create Account
        </Link>
      </div>
    </section>
  );
}
