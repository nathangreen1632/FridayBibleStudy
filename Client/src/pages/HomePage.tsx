import React from 'react';
import HeroSectionView from '../jsx/heroSectionView';
import PhilosophyView from '../jsx/philosophyView';

export default function HomePage(): React.ReactElement {
  return (
    <main className="bg-[var(--theme-bg)] text-[var(--theme-text)] min-h-[65vh] flex flex-col">
      <div className="flex-grow">
        <HeroSectionView />
        <PhilosophyView />
      </div>
    </main>
  );
}
