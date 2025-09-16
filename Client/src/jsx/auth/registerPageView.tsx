// Client/src/jsx/registerPageView.tsx
import React from 'react';
import { pressBtn } from '../../../ui/press.ts';
import type { RegisterFormState } from '../../types/pages/register.types.ts';

type Props = {
  form: RegisterFormState;
  loading: boolean;
  ready: boolean;
  error: string | null;

  showPw: boolean;
  showConfirm: boolean;
  passwordsMatch: boolean;
  showPwdStatus: boolean;

  // handlers
  onChange: (next: Partial<RegisterFormState>) => void;
  onTogglePw: () => void;
  onToggleConfirm: () => void;
  onSubmit: (e: React.FormEvent) => void;

  // phone formatter (kept in logic, but used here)
  formatPhone: (v: string) => string;
};

export default function RegisterPageView({
                                           form,
                                           loading,
                                           ready,
                                           error,
                                           showPw,
                                           showConfirm,
                                           passwordsMatch,
                                           showPwdStatus,
                                           onChange,
                                           onTogglePw,
                                           onToggleConfirm,
                                           onSubmit,
                                           formatPhone,
                                         }: Readonly<Props>): React.ReactElement {
  function getConfirmBorderColorClass(): string {
    if (showPwdStatus && passwordsMatch) return 'border-green-600';
    if (showPwdStatus && !passwordsMatch) return 'border-[var(--theme-error)]';
    return 'border-[var(--theme-border)]';
  }

  return (
    <div className="min-h-[80vh] bg-[var(--theme-bg)] text-[var(--theme-text)] flex items-center justify-center p-2 sm:p-4">
      <form
        onSubmit={onSubmit}
        aria-label="Register"
        className="w-full max-w-md bg-[var(--theme-accent)] border border-[var(--theme-border)] rounded-2xl shadow-md md:shadow-[0_4px_14px_0_var(--theme-shadow)] p-4 sm:p-6 md:p-8 space-y-4 sm:space-5"
      >
        <header className="space-y-1 text-center">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--theme-text-white)]">Create your account</h1>
          <p className="text-[var(--theme-text-white)] text-sm sm:text-md opacity-80">Join the Friday Bible Study community</p>
        </header>

        {/* Name */}
        <label className="block text-xs sm:text-sm font-medium">
          <span className="text-[var(--theme-text-white)] text-sm sm:text-base mb-1 block">Name</span>
          <input
            required
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 text-sm sm:text-base
                       text-[var(--theme-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] placeholder:text-[var(--theme-placeholder)]"
            placeholder="Your full name"
          />
        </label>

        {/* Phone (strict format) */}
        <label className="block text-xs sm:text-sm font-medium">
          <span className="text-[var(--theme-text-white)] text-sm sm:text-base mb-1 block">Phone</span>
          <input
            required
            type="tel"
            inputMode="numeric"
            name="tel"
            autoComplete="tel"
            maxLength={12} // 3+1+3+1+4
            placeholder="555-123-4567"
            value={form.phone}
            onChange={(e) => onChange({ phone: formatPhone(e.target.value) })}
            pattern="^\d{3}-\d{3}-\d{4}$"
            title="Format: 555-123-4567"
            className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 text-sm sm:text-base
                       text-[var(--theme-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] placeholder:text-[var(--theme-placeholder)]"
          />
        </label>

        {/* Email */}
        <label className="block text-xs sm:text-sm font-medium">
          <span className="text-[var(--theme-text-white)] text-sm sm:text-base mb-1 block">Email</span>
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => onChange({ email: e.target.value })}
            className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 text-sm sm:text-base
                       text-[var(--theme-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] placeholder:text-[var(--theme-placeholder)]"
            placeholder="you@example.com"
          />
        </label>

        {/* Password */}
        <label className="block text-xs sm:text-sm font-medium">
          <span className="text-[var(--theme-text-white)] text-sm sm:text-base mb-1 block">Password</span>
          <div className="relative">
            <input
              required
              type={showPw ? 'text' : 'password'}
              name="newPassword"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => onChange({ password: e.target.value })}
              className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 pr-16 text-sm sm:text-base
                         text-[var(--theme-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] placeholder:text-[var(--theme-placeholder)]"
              placeholder="Minimum 8 characters"
            />
            <button
              type="button"
              onClick={onTogglePw}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-3 py-1.5 text-xs sm:text-sm font-semibold
                         text-[var(--theme-placeholder)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]"
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>

        {/* Confirm Password */}
        <label className="block text-xs sm:text-sm font-medium">
          <span className="text-[var(--theme-text-white)] text-sm sm:text-base mb-1 block">Confirm Password</span>
          <div className="relative">
            <input
              required
              autoComplete="new-password"
              name="newPasswordConfirm"
              type={showConfirm ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={(e) => onChange({ confirmPassword: e.target.value })}
              className={`block w-full rounded-xl bg-[var(--theme-textbox)] px-3 py-2 pr-16 text-sm sm:text-base text-[var(--theme-placeholder)]
                          border ${getConfirmBorderColorClass()}
                          focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]
                          focus:ring-offset-2 focus:ring-offset-[var(--theme-bg)] placeholder:text-[var(--theme-placeholder)]`}
              placeholder="Re-enter your password"
            />
            <button
              type="button"
              onClick={onToggleConfirm}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-3 py-1.5 text-xs sm:text-sm font-semibold
                         text-[var(--theme-placeholder)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]"
            >
              {showConfirm ? 'Hide' : 'Show'}
            </button>
          </div>

          {showPwdStatus && !passwordsMatch && (
            <p className="mt-2 text-xs sm:text-sm text-[var(--theme-error)] font-medium">
              Passwords do not match, please try again
            </p>
          )}
          {showPwdStatus && passwordsMatch && (
            <p className="mt-2 text-xs sm:text-sm text-green-600 font-medium">
              Passwords match! Please create account now.
            </p>
          )}
        </label>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-[var(--theme-error)] bg-[var(--theme-surface)] px-3 py-2 text-xs sm:text-sm text-[var(--theme-error)] font-medium"
          >
            {error}
          </p>
        )}

        <button
          disabled={loading || !ready || !passwordsMatch}
          className={pressBtn("w-full rounded-2xl bg-[var(--theme-button-dark)] px-4 py-2.5 sm:py-3 text-[var(--theme-text)] text-sm sm:text-base font-semibold hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] disabled:opacity-60 disabled:cursor-not-allowed")}
        >
          {loading ? '…' : 'Create account'}
        </button>

        {!ready && (
          <p className="text-xs opacity-80">
            Security check is loading. If this takes long, disable ad blockers and refresh.
          </p>
        )}
      </form>
    </div>
  );
}
