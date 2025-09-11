import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {pressBtn} from "../../ui/press.ts";

/**
 * Computes the image's natural aspect ratio at runtime.
 * - Safe fallback so there's no layout flash before load.
 * - Never throws and cleans up properly.
 */
function useNaturalAspect(src: string, fallback: number = 16 / 9): number {
  const [ratio, setRatio] = useState<number>(fallback);

  useEffect(() => {
    let canceled = false;
    const img = new Image();
    img.decoding = "async";
    img.src = src;

    const onLoad = () => {
      if (canceled) return;
      const w = img.naturalWidth || 0;
      const h = img.naturalHeight || 0;
      if (w > 0 && h > 0) {
        setRatio(w / h);
      }
    };

    const onError = () => {
      // graceful: keep fallback ratio
    };

    img.addEventListener("load", onLoad);
    img.addEventListener("error", onError);

    return () => {
      canceled = true;
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
    };
  }, [src]);

  return ratio;
}

export default function PhilosophyView(): React.ReactElement {
  const bannerSrc = "/bible-study-banner.webp";
  const ratio = useNaturalAspect(bannerSrc, 16 / 9); // fallback keeps layout stable pre-load

  return (
    <section className="pt-2 sm:pt-3 pb-3 sm:pb-5 px-3 sm:px-6 max-w-6xl mx-auto text-center text-[var(--theme-text)]">
      {/* Card container */}
      <div className="rounded-2xl sm:rounded-3xl overflow-hidden bg-[var(--theme-surface)] shadow-md md:shadow-[0_4px_14px_0_var(--theme-shadow)]">

        {/* Aspect-ratio wrapper: no more fixed heights, no crop */}
        <div
          className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl"
          style={{ aspectRatio: ratio }} // e.g., 1.78 (16:9) once image is known
        >
          <img
            src={bannerSrc}
            alt="Friday Bible Study group banner"
            className="absolute inset-0 w-full h-full object-contain"
            decoding="async"
            loading="eager"
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
          className={pressBtn("inline-block w-full sm:w-auto text-center px-5 sm:px-6 py-2.5 sm:py-3 border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] rounded-xl font-medium hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] transition focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]/30")}
        >
          Login to Portal
        </Link>
        <Link
          to="/register"
          className={pressBtn("inline-block w-full sm:w-auto text-center px-5 sm:px-6 py-2.5 sm:py-3 border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] rounded-xl font-medium hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] transition focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]/30")}
        >
          Create Account
        </Link>
      </div>
    </section>
  );
}
