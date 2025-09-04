import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { apiWithRecaptcha } from '../helpers/secure-api.helper';

export default function RequestReset(): React.ReactElement {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  const valid = useMemo(() => {
    if (!email) return false;
    return email.includes('@');

  }, [email]);

  useEffect(() => {
    // secure-api.helper initializes reCAPTCHA as needed
    setReady(true);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setSubmitting(true);

    try {
      const res = await apiWithRecaptcha(
        '/api/auth/request-reset',
        'password_reset_request',
        {
          method: 'POST',
          body: JSON.stringify({ email }),
        }
      );

      if (res && typeof res === 'object' && 'ok' in res && res.ok) {
        toast.success('If the email exists, a code is on the way.');
        // ✅ Redirect to ResetPassword and prefill email via route state and query (nice for refresh)
        nav(`/reset-password?email=${encodeURIComponent(email)}`, {
          replace: true,
          state: { email },
        });
        return;
      }

      const msg =
        res && typeof res === 'object' && 'error' in res && res.error
          ? String(res.error)
          : 'Unable to request reset right now.';
      toast.error(msg);
    } catch {
      toast.error('Network error while requesting reset.');
    } finally {
      setSubmitting(false);
    }
  }

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
              onChange={(e) => setEmail(e.target.value)}
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
