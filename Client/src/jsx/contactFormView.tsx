// Client/src/components/contact/ContactForm.view.tsx
import React from 'react';

type Props = {
  form: { name: string; email: string; message: string };
  submitting: boolean;
  onChange: (key: 'name' | 'email' | 'message', value: string) => void;
  onSubmit: () => void;
};

export default function ContactFormView({
                                          form,
                                          submitting,
                                          onChange,
                                          onSubmit,
                                        }: Readonly<Props>): React.ReactElement {
  const messageHasText = form.message.trim().length > 0;
  const canSubmit = !submitting && messageHasText;

  return (
    <div className="w-full mx-auto max-w-lg rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-md md:shadow-[0_6px_16px_var(--theme-shadow)] p-4 sm:p-6">
      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl text-center font-semibold mb-2 sm:mb-3">
          Contact Us
        </h2>

        <label className="block">
          <span className="block uppercase tracking-wider text-[11px] sm:text-xs mb-1 text-[var(--theme-accent)]/80">Name</span>
          <input
            className="w-full rounded-xl px-3 py-2 bg-[var(--theme-textbox)] text-[var(--theme-text)] border border-[var(--theme-border)] text-sm sm:text-base shadow-[0_2px_6px_var(--theme-shadow)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-link)] focus:ring-offset-2 focus:ring-offset-[var(--theme-surface)] focus:shadow-[inset_0_0_0_1px_var(--theme-border),_0_4px_12px_var(--theme-shadow)] placeholder:text-[var(--theme-placeholder)]"
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Your full name"
            disabled={submitting}
          />
        </label>

        <label className="block">
          <span className="block uppercase tracking-wider text-[11px] sm:text-xs mb-1 text-[var(--theme-accent)]/80">Email</span>
          <input
            type="email"
            className="w-full rounded-xl px-3 py-2 bg-[var(--theme-textbox)] text-[var(--theme-text)] border border-[var(--theme-border)] text-sm sm:text-base shadow-[0_2px_6px_var(--theme-shadow)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-link)] focus:ring-offset-2 focus:ring-offset-[var(--theme-surface)] focus:shadow-[inset_0_0_0_1px_var(--theme-border),_0_4px_12px_var(--theme-shadow)] placeholder:text-[var(--theme-placeholder)]"
            value={form.email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="you@example.com"
            disabled={submitting}
          />
        </label>

        <label className="block">
          <span className="block uppercase tracking-wider text-[11px] sm:text-xs mb-1 text-[var(--theme-accent)]/80">Message</span>
          <textarea
            className="w-full min-h-[120px] sm:min-h-[140px] rounded-xl px-3 py-2 bg-[var(--theme-textbox)] text-[var(--theme-text)] border border-[var(--theme-border)] text-sm sm:text-base leading-relaxed shadow-[0_2px_6px_var(--theme-shadow)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-link)] focus:ring-offset-2 focus:ring-offset-[var(--theme-surface)] focus:shadow-[inset_0_0_0_1px_var(--theme-border),_0_4px_12px_var(--theme-shadow)] custom-scrollbar placeholder:text-[var(--theme-placeholder)]/80"
            value={form.message}
            onChange={(e) => onChange('message', e.target.value)}
            placeholder="How can we help?"
            disabled={submitting}
          />
        </label>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          title={!messageHasText ? 'Please enter a message first' : undefined}
          className="w-full mt-2 rounded-2xl px-4 py-2.5 sm:py-3 font-semibold text-sm sm:text-base bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] disabled:cursor-not-allowed"
          aria-disabled={!canSubmit}
        >
          {submitting ? 'Sending…' : 'Send Message'}
        </button>

        <p className="text-xs sm:text-sm mt-1 text-center text-[var(--theme-accent)]/80">
          We respond within 1–2 business days. Your info stays private.
        </p>
      </div>
    </div>
  );
}
