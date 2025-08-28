// Client/src/pages/auth/Register.auth.tsx
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { loadRecaptchaEnterprise, getRecaptchaToken } from '../../lib/recaptcha.lib';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

export default function Register(): React.ReactElement {
  const { register, loading } = useAuthStore();
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [show, setShow] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preload the Enterprise script (safe if already loaded elsewhere)
  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!SITE_KEY) {
        setError('Missing reCAPTCHA site key');
        return;
      }
      try {
        await loadRecaptchaEnterprise(SITE_KEY);
        if (mounted) setReady(true);
      } catch {
        if (mounted) setError('Unable to load reCAPTCHA. Check network or ad blockers.');
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      if (!SITE_KEY) throw new Error('Missing reCAPTCHA site key');
      // Always fetch a fresh Enterprise token right before submit
      const recaptchaToken = await getRecaptchaToken(SITE_KEY, 'register');

      // Pass token to your store; adjust if your store expects headers instead
      await register({ ...form, recaptchaToken });

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        aria-label="Register"
        className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl shadow-sm p-6 md:p-8 space-y-5"
      >
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-neutral-900">Create your account</h1>
          <p className="text-sm text-neutral-500">Join the Friday Bible Study community.</p>
        </header>

        <label className="block text-sm font-medium text-neutral-800">
          <span className="mb-1 block">Name</span>
          <input
            required
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="block w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            placeholder="Your full name"
          />
        </label>

        <label className="block text-sm font-medium text-neutral-800">
          <span className="mb-1 block">Phone</span>
          <input
            required
            name="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="block w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            placeholder="(555) 123-4567"
          />
        </label>

        <label className="block text-sm font-medium text-neutral-800">
          <span className="mb-1 block">Email</span>
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="block w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            placeholder="you@example.com"
          />
        </label>

        <label className="block text-sm font-medium text-neutral-800">
          <span className="mb-1 block">Password</span>
          <div className="relative">
            <input
              required
              aria-describedby="password-help"
              type={show ? 'text' : 'password'}
              name="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="block w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 pr-12 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              placeholder="Minimum 8 characters"
            />
            <button
              type="button"
              aria-label={show ? 'Hide password' : 'Show password'}
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            >
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
          <small id="password-help" className="mt-1 block text-xs text-neutral-500">
            Minimum 8 characters, include letters &amp; numbers.
          </small>
        </label>

        {error && (
          <p
            role="alert"
            aria-live="polite"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <button
          disabled={loading || !ready}
          className="w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-white font-semibold hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900"
        >
          {loading ? '…' : 'Create account'}
        </button>

        {!ready && (
          <p className="text-xs text-neutral-500">Loading security…</p>
        )}
      </form>
    </div>
  );
}
