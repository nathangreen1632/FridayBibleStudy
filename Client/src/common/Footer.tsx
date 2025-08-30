import React from "react";

export default function Footer(): React.ReactElement {
  const currentYear: number = new Date().getFullYear();

  return (
    <footer className="bg-[var(--theme-bg)] border-t border-[var(--theme-border)] text-[var(--theme-text)] shadow-[0_-2px_6px_0_var(--theme-shadow)] px-4 sm:px-6 lg:px-8 py-4 sm:py-6 text-center text-xs sm:text-sm">
      <p className="opacity-80 leading-6">
        © {currentYear} One Guy Productions. All rights reserved.
      </p>
    </footer>
  );
}
