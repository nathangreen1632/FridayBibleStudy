// Client/src/pages/HomePage.tsx
import React from 'react';
import PhilosophyView from '../jsx/philosophyView';

export default function HomePage(): React.ReactElement {
  return (
    <main className="bg-[var(--theme-bg)] text-[var(--theme-text)] min-h-[80vh] flex flex-col pt-4 sm:pt-6">
      <div className="flex-grow space-y-3 sm:space-y-6">
        <PhilosophyView/>
      </div>
    </main>
  );
}
