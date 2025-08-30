// Client/src/components/contact/ContactForm.view.tsx
import React from 'react';

type Props = {
  form: { name: string; email: string; message: string };
  submitting: boolean;
  savedMsg: string | null;
  error: string | null;
  onChange: (key: 'name' | 'email' | 'message', value: string) => void;
  onSubmit: () => void;
};

export default function ContactFormView({
                                          form, submitting, savedMsg, error, onChange, onSubmit,
                                        }: Readonly<Props>): React.ReactElement {
  return (
    <div className="w-full mx-auto max-w-lg rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-md md:shadow-[0_6px_16px_var(--theme-shadow)] p-4 sm:p-6">
      {savedMsg && (
        <div className="mb-4 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
          {savedMsg}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <label className="block">
          <h2 className="text-xl sm:text-2xl text-center font-semibold mb-2 sm:mb-3">Contact Us</h2>
          <span className="block text-xs sm:text-sm mb-1">Name</span>
          <input
            className="w-full rounded-xl px-3 py-2 bg-[var(--theme-bg)] text-[var(--theme-text)] border border-[var(--theme-border)] text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]"
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Your full name"
            disabled={submitting}
          />
        </label>

        <label className="block">
          <span className="block text-xs sm:text-sm mb-1">Email</span>
          <input
            type="email"
            className="w-full rounded-xl px-3 py-2 bg-[var(--theme-bg)] text-[var(--theme-text)] border border-[var(--theme-border)] text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]"
            value={form.email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="you@example.com"
            disabled={submitting}
          />
        </label>

        <label className="block">
          <span className="block text-xs sm:text-sm mb-1">Message</span>
          <textarea
            className="w-full min-h-[120px] sm:min-h-[140px] rounded-xl px-3 py-2 bg-[var(--theme-bg)] text-[var(--theme-text)] border border-[var(--theme-border)] text-sm sm:text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] custom-scrollbar"
            value={form.message}
            onChange={(e) => onChange('message', e.target.value)}
            placeholder="How can we help?"
            disabled={submitting}
          />
        </label>

        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="w-full mt-2 rounded-2xl px-4 py-2.5 sm:py-3 font-semibold text-sm sm:text-base bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-blue-hover)] transition disabled:opacity-60"
        >
          {submitting ? 'Sending…' : 'Send Message'}
        </button>
      </div>
    </div>
  );
}
