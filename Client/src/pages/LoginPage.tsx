// Client/src/pages/auth/Login.auth.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../stores/useAuthStore.ts';
import { loadRecaptchaEnterprise, getRecaptchaToken } from '../lib/recaptcha.lib.ts';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

export default function Login(): React.ReactElement {
  const nav = useNavigate();
  const loc = useLocation();
  const { login, loading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [ready, setReady] = useState(false);        // reCAPTCHA readiness (optional)
  const [err, setErr] = useState<string | null>(null);

  // Load reCAPTCHA (optional; login proceeds even if unavailable)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!SITE_KEY) { setReady(true); return; } // allow login without captcha if not configured
      try {
        await loadRecaptchaEnterprise(SITE_KEY);
        if (mounted) setReady(true);
      } catch {
        if (mounted) {
          setReady(false);
          // Don’t block login; just inform
          toast.error('Security check could not load. You can still try to sign in.');
          setReady(true);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  const disabled = useMemo(() => loading || !email || !password, [loading, email, password]);

  async function safeGetRecaptchaToken(): Promise<string | null> {
    if (!SITE_KEY) return null;
    try {
      const token = await getRecaptchaToken(SITE_KEY, 'login');
      return token || null;
    } catch {
      return null;
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    // Optional: obtain token (not required for existing login signature)
    const recaptchaToken = ready ? await safeGetRecaptchaToken() : null;
    if (SITE_KEY && !recaptchaToken) {
      // Non-blocking warning if site key exists but token failed
      toast('Proceeding without security token.', { icon: '⚠️' });
    }

    const { success, message } = await login(email, password /* , recaptchaToken */);
    if (success) {
      toast.success('Welcome back!');
      const to = (loc.state)?.from ?? '/portal';
      nav(to, { replace: true });
    } else {
      const msg = message ?? 'Login failed';
      setErr(msg);
      toast.error(msg);
    }
  }

  return (
    <div className="min-h-[80vh] bg-[var(--theme-bg)] text-[var(--theme-text)] flex items-center justify-center p-3 sm:p-4">
      {/* Global <Toaster /> is rendered in App.tsx */}

      <form
        onSubmit={onSubmit}
        aria-label="Sign in"
        className="w-full max-w-md bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-md md:shadow-[0_4px_14px_0_var(--theme-shadow)] p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5"
      >
        <header className="space-y-1 text-center">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--theme-accent)]">Sign in</h1>
          <p className="text-sm sm:text-md opacity-80">Welcome back to Friday Bible Study.</p>
        </header>

        {/* Email */}
        <label className="block text-xs sm:text-sm font-medium">
          <span className="text-sm sm:text-base mb-1 block">Email</span>
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 text-sm sm:text-base
                       text-[var(--theme-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] placeholder:text-[var(--theme-placeholder)]"
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 pr-16 text-sm sm:text-base
                         text-[var(--theme-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] placeholder:text-[var(--theme-placeholder)]"
              placeholder="Your password"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-3 py-1.5 text-xs sm:text-sm font-semibold
                         text-[var(--theme-placeholder)] hover:bg-[var(--theme-card-hover)]"
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
          className="w-full rounded-xl bg-[var(--theme-button)] px-4 py-2.5 sm:py-3 text-[var(--theme-text-white)] text-sm sm:text-base font-semibold
                     hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? '…' : 'Sign in'}
        </button>

        <div className="text-xs sm:text-sm pt-2 sm:pt-3 space-y-2 text-center">
          <p>
            <Link to="/request-reset" className="underline">
              Forgot password?
            </Link>
          </p>
          <p className="opacity-80">
            <Link to="/register" className="underline">
              Create Account
            </Link>
          </p>
        </div>

      </form>
    </div>
  );
}
