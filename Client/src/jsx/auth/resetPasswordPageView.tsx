// Client/src/jsx/resetPasswordPageView.tsx
import React from 'react';
import type { ResetFormState } from '../../types/pages/resetPassword.types.ts';

type Props = {
  form: ResetFormState;
  submitting: boolean;
  ready: boolean;
  passwordsMatch: boolean;
  showPwdStatus: boolean;
  showNew: boolean;
  showConfirm: boolean;
  valid: boolean;

  update: <K extends keyof ResetFormState>(key: K, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggleShowNew: () => void;
  onToggleShowConfirm: () => void;

  // logic-owned formatter for the OTP display (keeps digits in state)
  formatOtp: (raw: string) => string;
};

export default function ResetPasswordPageView({
                                                form,
                                                submitting,
                                                ready,
                                                passwordsMatch,
                                                showPwdStatus,
                                                showNew,
                                                showConfirm,
                                                valid,
                                                update,
                                                onSubmit,
                                                onToggleShowNew,
                                                onToggleShowConfirm,
                                                formatOtp,
                                              }: Readonly<Props>): React.ReactElement {
  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-[var(--theme-surface)] p-6 shadow-md border border-[var(--theme-border)]">
        <h1 className="text-center text-xl font-semibold mb-4 text-[var(--theme-text)]">Reset password</h1>
        <p className="text-center text-sm mb-6 text-[var(--theme-text)]/80">
          Please check your email, then enter the one-time code you received, and your new password
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-email" className="block text-sm mb-1">Email</label>
            <input
              id="reset-email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] placeholder:text-[var(--theme-placeholder)]/80"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="reset-otp" className="block text-sm mb-1">One-time code</label>
            <input
              id="reset-otp"
              name="otp"
              type="text"
              inputMode="numeric"
              pattern="^[0-9]{3}-?[0-9]{3}$"   // allows 123456 or 123-456
              value={formatOtp(form.otp)}
              maxLength={7}
              onChange={(e) => update('otp', e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] placeholder:text-[var(--theme-placeholder)]/80"
              placeholder="6-digit code"
            />
          </div>

          <div>
            <label htmlFor="reset-new-password" className="block text-sm mb-1">New password</label>
            <div className="relative">
              <input
                id="reset-new-password"
                name="newPassword"
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.newPassword}
                onChange={(e) => update('newPassword', e.target.value)}
                className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] placeholder:text-[var(--theme-placeholder)]/80"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={onToggleShowNew}
                aria-label={showNew ? 'Hide new password' : 'Show new password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-3 py-1.5 text-xs sm:text-sm font-semibold
                         text-[var(--theme-placeholder)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]"
              >
                {showNew ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="reset-confirm-password" className="block text-sm mb-1">Confirm new password</label>
            <div className="relative">
              <input
                id="reset-confirm-password"
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(e) => update('confirmPassword', e.target.value)}
                className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] placeholder:text-[var(--theme-placeholder)]/80"
                placeholder="••••••••"
                aria-invalid={!passwordsMatch && (form.confirmPassword.length > 0 || form.newPassword.length > 0) ? 'true' : 'false'}
              />
              <button
                type="button"
                onClick={onToggleShowConfirm}
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-3 py-1.5 text-xs sm:text-sm font-semibold
                         text-[var(--theme-placeholder)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]"
              >
                {showConfirm ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {showPwdStatus && !passwordsMatch && (
            <p className="mt-2 text-xs sm:text-sm text-[var(--theme-error)] font-medium">
              Passwords do not match, please try again
            </p>
          )}
          {showPwdStatus && passwordsMatch && (
            <p className="mt-2 text-xs sm:text-sm text-green-600 font-medium">
              Passwords match! Please reset password now.
            </p>
          )}

          <button
            type="submit"
            disabled={!ready || submitting || !valid}
            className={[
              'w-full rounded-lg px-4 py-2 font-semibold transition-colors',
              'bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]',
              (!ready || submitting || !valid) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
          >
            {submitting ? 'Resetting…' : 'Reset password'}
          </button>
        </form>
      </div>
    </div>
  );
}
