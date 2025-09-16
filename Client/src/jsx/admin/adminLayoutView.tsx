import React from 'react';
import type { AdminLayoutViewProps } from '../../types/admin/adminLayout.types.ts';

export default function AdminLayoutView({
                                          children,
                                        }: AdminLayoutViewProps): React.ReactElement {
  return (
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]">
      {/* Shared width container for header + main */}
      <div className="mx-auto max-w-10xl px-4">
        <header className="sticky top-0 z-10 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl mt-2">
          <div className="py-3 flex items-center justify-center">
            {/* choose one: text-3d-raised or text-3d-engraved */}
            <h1 className="font-extrabold text-3xl text-center text-[var(--theme-accent)] text-3d-raised">
              FBS Admin Portal
            </h1>
          </div>
        </header>

        <main className="py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
