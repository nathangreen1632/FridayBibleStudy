import React from 'react';
import { useLocation } from 'react-router-dom';
import ContactFormLogic from './ContactForm.logic';

export default function ContactPage(): React.ReactElement {
  const { pathname } = useLocation();

  return (
    <main className="min-h-[84vh] px-6 py-12 max-w-2xl mx-auto bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <ContactFormLogic key={pathname} />
    </main>
  );
}
