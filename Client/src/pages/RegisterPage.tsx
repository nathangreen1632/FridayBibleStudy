// Client/src/pages/auth/Register.auth.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../stores/useAuthStore.ts';
import { loadRecaptchaEnterprise, getRecaptchaToken } from '../lib/recaptcha.lib.ts';
import {pressBtn} from "../../ui/press.ts";

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

export default function Register(): React.ReactElement {
  const { register, loading } = useAuthStore();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- phone helpers (strict 555-123-4567) ---
  const phoneRE = /^\d{3}-\d{3}-\d{4}$/;
  function formatPhone(value: string): string {
    const d = value.replace(/\D/g, '').slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  }
  // -------------------------------------------

  const passwordsMatch = useMemo(
    () => form.password.length > 0 && form.password === form.confirmPassword,
    [form.password, form.confirmPassword]
  );
  const showPwdStatus = form.confirmPassword.length > 0;

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!SITE_KEY) {
        if (mounted) {
          setReady(false);
          setError('Security setup incomplete. Please contact support.');
          toast.error('Security setup incomplete. Please contact support.');
        }
        return;
      }
      try {
        await loadRecaptchaEnterprise(SITE_KEY);
        if (mounted) setReady(true);
      } catch {
        if (mounted) {
          setReady(false);
          setError('Unable to load reCAPTCHA. Disable ad blockers and retry.');
          toast.error('Unable to load reCAPTCHA. Disable ad blockers and retry.');
        }
      }
    })();

    return () => { mounted = false; };
  }, []);

  async function safeGetRecaptchaToken(): Promise<string | null> {
    if (!SITE_KEY) return null;
    try {
      const token = await getRecaptchaToken(SITE_KEY, 'register');
      return token || null;
    } catch {
      return null;
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // phone is required here; must match 555-123-4567
    if (!form.phone || !phoneRE.test(form.phone)) {
      const msg = 'Please enter your phone as 555-123-4567';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!form.password || !form.confirmPassword) {
      const msg = 'Please enter and confirm your password.';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!passwordsMatch) {
      const msg = 'Passwords do not match.';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!SITE_KEY) {
      const msg = 'Security setup is incomplete.';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!ready) {
      const msg = 'Security check not ready yet. Please wait a moment.';
      setError(msg);
      toast.error(msg);
      return;
    }

    const recaptchaToken = await safeGetRecaptchaToken();
    if (!recaptchaToken) {
      const msg = 'Could not verify security check. Refresh and try again.';
      setError(msg);
      toast.error(msg);
      return;
    }

    try {
      const { confirmPassword, ...payload } = form;
      await register({ ...payload, recaptchaToken });
      toast.success('Account created successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(msg);
      toast.error(msg);
    }
  }

  function getConfirmBorderColorClass(): string {
    if (showPwdStatus && passwordsMatch) return 'border-green-600';
    if (showPwdStatus && !passwordsMatch) return 'border-[var(--theme-error)]';
    return 'border-[var(--theme-border)]';
  }

  return (
    <div className="min-h-[80vh] bg-[var(--theme-bg)] text-[var(--theme-text)] flex items-center justify-center p-2 sm:p-4">
      {/* Global <Toaster /> is rendered in App.tsx */}

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
            onChange={(e) => setForm({ ...form, name: e.target.value })}
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
            onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
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
            onChange={(e) => setForm({ ...form, email: e.target.value })}
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
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 pr-16 text-sm sm:text-base
                         text-[var(--theme-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] placeholder:text-[var(--theme-placeholder)]"
              placeholder="Minimum 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
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
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className={`block w-full rounded-xl bg-[var(--theme-textbox)] px-3 py-2 pr-16 text-sm sm:text-base text-[var(--theme-placeholder)]
                          border ${getConfirmBorderColorClass()}
                          focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]
                          focus:ring-offset-2 focus:ring-offset-[var(--theme-bg)] placeholder:text-[var(--theme-placeholder)]`}
              placeholder="Re-enter your password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
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
