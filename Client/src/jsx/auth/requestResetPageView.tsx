import React from 'react';

type Props = {
  email: string;
  ready: boolean;
  submitting: boolean;
  valid: boolean;

  onChangeEmail: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export default function RequestResetPageView({
                                               email,
                                               ready,
                                               submitting,
                                               valid,
                                               onChangeEmail,
                                               onSubmit,
                                             }: Readonly<Props>): React.ReactElement {
  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-[var(--theme-surface)] p-6 shadow-md border border-[var(--theme-border)]">
        <h1 className="text-center text-xl font-semibold mb-4 text-[var(--theme-text)]">
          Forgot your password?
        </h1>
        <p className="text-center text-sm mb-6 text-[var(--theme-text)]/80">
          Enter your account email and we’ll send a one-time code.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="request-reset-email" className="block text-sm mb-1">
              Email
            </label>
            <input
              id="request-reset-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => onChangeEmail(e.target.value)}
              className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] placeholder:text-[var(--theme-placeholder)]/80"
              placeholder="you@example.com"
              aria-invalid={!valid && email.length > 0 ? 'true' : 'false'}
            />
          </div>

          <button
            type="submit"
            disabled={!ready || submitting || !valid}
            className={[
              'w-full rounded-lg px-4 py-2 font-semibold transition-colors',
              'bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]',
              (!ready || submitting || !valid) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
          >
            {submitting ? 'Sending…' : 'Send code'}
          </button>
        </form>
      </div>
    </div>
  );
}
