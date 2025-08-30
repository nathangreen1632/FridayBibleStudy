// Client/src/pages/auth/Register.auth.tsx
import React, { useEffect, useState, useMemo } from 'react';
import toast, { Toaster } from 'react-hot-toast';   // ✅ toast support
import { useAuthStore } from '../../stores/auth.store';
import { loadRecaptchaEnterprise, getRecaptchaToken } from '../../lib/recaptcha.lib';

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

    return () => {
      mounted = false;
    };
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

  // 1) Helper returns only the BORDER COLOR class
  function getConfirmBorderColorClass(): string {
    if (showPwdStatus && passwordsMatch) return 'border-green-600';
    if (showPwdStatus && !passwordsMatch) return 'border-[var(--theme-error)]';
    return 'border-[var(--theme-border)]';
  }

  return (
    <div className="min-h-[83vh] bg-[var(--theme-bg)] text-[var(--theme-text)] flex items-center justify-center p-2 sm:p-4">
      <Toaster position="top-center" reverseOrder={false} /> {/* ✅ global toaster */}

      <form
        onSubmit={onSubmit}
        aria-label="Register"
        className="w-full max-w-md bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-md md:shadow-[0_4px_14px_0_var(--theme-shadow)] p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5"
      >
        <header className="space-y-1 text-center">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--theme-accent)]">Create your account</h1>
          <p className="text-sm sm:text-md opacity-80">Join the Friday Bible Study community.</p>
        </header>

        {/* Name */}
        <label className="block text-xs sm:text-sm font-medium">
          <span className="text-sm sm:text-base mb-1 block">Name</span>
          <input
            required
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm sm:text-base
                       text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]"
            placeholder="Your full name"
          />
        </label>

        {/* Phone */}
        <label className="block text-xs sm:text-sm font-medium">
          <span className="text-sm sm:text-base mb-1 block">Phone</span>
          <input
            required
            name="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm sm:text-base
                       text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]"
            placeholder="555-123-4567"
          />
        </label>

        {/* Email */}
        <label className="block text-xs sm:text-sm font-medium">
          <span className="text-sm sm:text-base mb-1 block">Email</span>
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm sm:text-base
                       text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]"
            placeholder="you@example.com"
          />
        </label>

        {/* Password */}
        <label className="block text-xs sm:text-sm font-medium">
          <span className="text-sm sm:text-base mb-1 block">Password</span>
          <div className="relative">
            <input
              required
              type={showPw ? 'text' : 'password'}
              name="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 pr-16 text-sm sm:text-base
                         text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]"
              placeholder="Minimum 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-3 py-1.5 text-xs sm:text-sm font-semibold
                         text-[var(--theme-text)] hover:bg-[var(--theme-card-hover)]"
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>

        {/* Confirm Password */}
        <label className="block text-xs sm:text-sm font-medium">
          <span className="text-sm sm:text-base mb-1 block">Confirm Password</span>
          <div className="relative">
            <input
              required
              autoComplete="off"
              name="confirm"
              type={showConfirm ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className={
                `block w-full rounded-xl bg-[var(--theme-surface)] px-3 py-2 pr-16 text-sm sm:text-base text-[var(--theme-text)]
         border ${getConfirmBorderColorClass()} 
         focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]
         focus:ring-offset-2 focus:ring-offset-[var(--theme-bg)]`
              }
              placeholder="Re-enter your password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-3 py-1.5 text-xs sm:text-sm font-semibold
                 text-[var(--theme-text)] hover:bg-[var(--theme-card-hover)]"
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
          className="w-full rounded-xl bg-[var(--theme-button)] px-4 py-2.5 sm:py-3 text-[var(--theme-text-white)] text-sm sm:text-base font-semibold
                     hover:bg-[var(--theme-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
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
