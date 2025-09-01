// Client/src/App.tsx
import React from 'react';
import AppRoutes from './AppRoutes';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/nav/Navbar.tsx';
import Footer from './common/Footer.tsx';

export default function App(): React.ReactElement {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--theme-bg)]">
      {/* Header */}
      <Navbar />

      {/* Page content grows to push footer down */}
      <main className="flex-grow max-w-5xl mx-auto p-3 w-full">
        <AppRoutes />
      </main>

      {/* Footer always at the bottom */}
      <Footer />

      {/* Global toast notifications */}
      <Toaster position="top-center" />
    </div>
  );
}
