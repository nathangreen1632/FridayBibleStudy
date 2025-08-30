import React from "react";

export default function PhilosophyView(): React.ReactElement {
  return (
    <section className="py-10 px-4 sm:px-6 max-w-6xl mx-auto text-center text-[var(--theme-text)]">
      <div className="rounded-3xl overflow-hidden shadow-[0_4px_14px_0_var(--theme-shadow)] bg-[var(--theme-surface)]">
        <div className="w-full h-[280px] sm:h-[400px] md:h-[480px] lg:h-[540px] xl:h-[600px] 2xl:h-[650px] overflow-hidden">
          <img
            src="/bible-study-banner.webp"
            alt="Friday Bible Study group banner"
            className="w-full h-full object-cover rounded-3xl"
          />
        </div>
        <div className="p-6 bg-[var(--theme-surface)] text-left sm:text-center">
          <p className="text-[var(--theme-text)]/90 text-base sm:text-lg mb-3">
            Our Friday Bible Study is built on fellowship, prayer, and a heart
            to grow in the Word together.
          </p>
          <p className="text-[var(--theme-text)]/70 text-sm sm:text-base">
            Every prayer request matters. Every praise encourages.
            This is a community where faith and friendship thrive.
          </p>
        </div>
      </div>
    </section>
  );
}
