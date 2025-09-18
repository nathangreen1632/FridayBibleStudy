import React from 'react';
import HomePageView from '../../jsx/home/homePageView.tsx';

export default function HomePageWrapper(): React.ReactElement {
  return (
    <main className="bg-[var(--theme-bg)] text-[var(--theme-text)] min-h-[70vh] flex flex-col pt-2 sm:pt-3">
      <div className="flex-grow space-y-3 sm:space-y-6">
        <HomePageView/>
      </div>
    </main>
  );
}
