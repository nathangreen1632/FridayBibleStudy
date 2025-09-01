// Client/src/pages/contact/ContactPageWrapper.tsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import ContactPage from './ContactPage.tsx';

export default function ContactPageWrapper(): React.ReactElement {
  const { pathname } = useLocation();

  return (
    <main className="min-h-[84vh] bg-[var(--theme-bg)] text-[var(--theme-text)] px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12 mx-auto max-w-xl sm:max-w-2xl">
      <ContactPage key={pathname} />
    </main>
  );
}
