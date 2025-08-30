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
    <div className="rounded-2xl shadow-md p-6 bg-[var(--theme-surface)] border border-[var(--theme-border)]">
      {savedMsg && (
        <div className="mb-4 rounded-lg px-4 py-3 text-sm bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
          {savedMsg}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg px-4 py-3 text-sm bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <label className="block">
          <span className="block text-sm mb-1">Name</span>
          <input
            className="w-full rounded-xl px-3 py-2 bg-[var(--theme-bg)] text-[var(--theme-text)] border border-[var(--theme-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]"
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Your full name"
            disabled={submitting}
          />
        </label>

        <label className="block">
          <span className="block text-sm mb-1">Email</span>
          <input
            type="email"
            className="w-full rounded-xl px-3 py-2 bg-[var(--theme-bg)] text-[var(--theme-text)] border border-[var(--theme-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]"
            value={form.email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="you@example.com"
            disabled={submitting}
          />
        </label>

        <label className="block">
          <span className="block text-sm mb-1">Message</span>
          <textarea
            className="w-full min-h-[140px] rounded-xl px-3 py-2 bg-[var(--theme-bg)] text-[var(--theme-text)] border border-[var(--theme-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] custom-scrollbar"
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
          className="w-full mt-2 rounded-2xl px-4 py-2 font-semibold bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-blue-hover)] transition disabled:opacity-60"
        >
          {submitting ? 'Sending…' : 'Send Message'}
        </button>
      </div>
    </div>
  );
}
