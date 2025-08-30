import React from 'react';
import { useLocation } from 'react-router-dom';
import ContactFormLogic from './ContactForm.logic';

export default function ContactPage(): React.ReactElement {
  const { pathname } = useLocation();

  return (
    <main className="min-h-[70vh] px-6 py-12 max-w-2xl mx-auto bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <h2 className="text-3xl font-extrabold text-center mb-10 text-[var(--theme-accent)]">
        Let&apos;s Chat
      </h2>
      {/* Re-mount on route change to clear form */}
      <ContactFormLogic key={pathname} />
    </main>
  );
}
