import React from 'react';
import { Link } from 'react-router-dom';
import { pressBtn } from '../../../ui/press.ts';

type Props = {
  email: string;
  password: string;
  showPw: boolean;
  err: string | null;
  loading: boolean;
  disabled: boolean;

  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onTogglePw: () => void;
  onSubmit: (e: React.FormEvent) => void;
};

export default function LoginPageView({
                                        email,
                                        password,
                                        showPw,
                                        err,
                                        loading,
                                        disabled,
                                        onEmailChange,
                                        onPasswordChange,
                                        onTogglePw,
                                        onSubmit,
                                      }: Readonly<Props>): React.ReactElement {
  return (
    <div className="min-h-[80vh] bg-[var(--theme-bg)] text-[var(--theme-text)] flex items-center justify-center p-3 sm:p-4">
      <form
        onSubmit={onSubmit}
        aria-label="Sign in"
        className="w-full max-w-md bg-[var(--theme-accent)] border border-[var(--theme-border)] rounded-2xl shadow-md md:shadow-[0_4px_14px_0_var(--theme-shadow)] p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5"
      >
        <header className="space-y-1 text-center">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--theme-text-white)]">Sign in</h1>
          <p className="text-[var(--theme-text-white)] text-sm sm:text-md opacity-80">
            Welcome back to Friday Bible Study.
          </p>
        </header>

        <label className="block text-xs sm:text-sm font-medium">
          <span className="text-[var(--theme-text-white)] text-sm sm:text-base mb-1 block">Email</span>
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 text-sm sm:text-base
                       text-[var(--theme-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] placeholder:text-[var(--theme-placeholder)]"
            placeholder="you@example.com"
          />
        </label>

        <label className="block text-xs sm:text-sm font-medium">
          <span className="text-[var(--theme-text-white)] text-sm sm:text-base mb-1 block">Password</span>
          <div className="relative">
            <input
              required
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 pr-16 text-sm sm:text-base
                         text-[var(--theme-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] placeholder:text-[var(--theme-placeholder)]"
              placeholder="Your password"
            />
            <button
              type="button"
              onClick={onTogglePw}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-3 py-1.5 text-xs sm:text-sm font-semibold
                         text-[var(--theme-placeholder)]/60 hover:text-[var(--theme-textbox)] hover:bg-[var(--theme-button-hover)]"
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>

        {err && (
          <p
            role="alert"
            className="rounded-lg border border-[var(--theme-error)] bg-[var(--theme-surface)] px-3 py-2 text-xs sm:text-sm text-[var(--theme-error)] font-medium"
          >
            {err}
          </p>
        )}

        <button
          type="submit"
          disabled={disabled}
          className={pressBtn(
            'w-full rounded-xl bg-[var(--theme-button-dark)] px-4 py-2.5 sm:py-3 text-[var(--theme-text)] text-sm sm:text-base font-semibold hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] disabled:opacity-60 disabled:cursor-not-allowed'
          )}
        >
          {loading ? '…' : 'Sign in'}
        </button>

        <div className="text-xs sm:text-sm pt-2 sm:pt-3 space-y-2 text-center">
          <p>
            <Link to="/request-reset" className="hover:underline text-[var(--theme-text-white)]">
              Forgot password?
            </Link>
          </p>
          <p>
            <Link to="/register" className="hover:underline text-[var(--theme-text-white)]">
              Create Account
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
