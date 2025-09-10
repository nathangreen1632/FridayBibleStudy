// Client/src/App.tsx
import React from 'react';
import AppRoutes from './AppRoutes';
import { Toaster } from 'react-hot-toast';
import Navbar from './common/Navbar.tsx';
import Footer from './common/Footer.tsx';
import GravatarStrip from './components/GravatarStrip.tsx';
import { useLocation } from 'react-router-dom';

export default function App(): React.ReactElement {
  const loc = useLocation();

  // Only widen the Admin Roster page
  let mainWidth = 'max-w-7xl 2xl:max-w-[80rem]';
  if (loc.pathname.startsWith('/admin/roster')) {
    // slightly wider, adjust to taste
    mainWidth = 'max-w-[90rem] 2xl:max-w-[100rem]';
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--theme-bg)]">
      {/* Header */}
      <Navbar />
      <GravatarStrip />

      {/* Page content grows to push footer down */}
      <main className={['flex-grow w-full mx-auto', mainWidth].join(' ')}>
        <AppRoutes />
      </main>

      {/* Footer always at the bottom */}
      <Footer />

      {/* Global toast notifications */}
      <Toaster position="top-center" />
    </div>
  );
}
