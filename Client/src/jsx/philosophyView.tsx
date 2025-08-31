// Client/src/jsx/philosophyView.tsx
import React from "react";

export default function PhilosophyView(): React.ReactElement {
  return (
    <section className="pt-4 sm:pt-6 pb-6 sm:pb-10 px-3 sm:px-6 max-w-6xl mx-auto text-center text-[var(--theme-text)]">
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
    </section>
  );
}
