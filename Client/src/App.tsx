// Client/src/App.tsx
import React from 'react';
import AppRoutes from './AppRoutes';
import { Toaster } from 'react-hot-toast';
import Navbar from './common/Navbar.tsx';
import Footer from './common/Footer.tsx';
import GravatarStrip from './components/GravatarStrip.tsx';

export default function App(): React.ReactElement {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--theme-bg)]">
      {/* Header */}
      <Navbar />
      <GravatarStrip />
      {/* Page content grows to push footer down */}
      <main className="flex-grow w-full mx-auto max-w-7xl 2xl:max-w-[80rem]">
        <AppRoutes />
      </main>


      {/* Footer always at the bottom */}
      <Footer />

      {/* Global toast notifications */}
      <Toaster position="top-center" />
    </div>
  );
}
