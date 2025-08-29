import React from "react";

export default function Footer(): React.ReactElement {
  const currentYear: number = new Date().getFullYear();

  return (
    <footer className="bg-[var(--theme-bg)] border-t border-[var(--theme-border)] py-6 text-center text-sm text-[var(--theme-text)] shadow-[0_-2px_6px_0_var(--theme-shadow)]">
      <p className="opacity-80">
        © {currentYear} One Guy Productions. All rights reserved.
      </p>
    </footer>
  );
}
