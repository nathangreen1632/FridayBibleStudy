// Client/src/pages/RegisterPageLogic.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../stores/useAuthStore.ts';
import { loadRecaptchaEnterprise, getRecaptchaToken } from '../../lib/recaptcha.lib.ts';
import RegisterPageView from '../../jsx/auth/registerPageView.tsx';
import type { RegisterFormState } from '../../types/pages/register.types.ts';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

export default function Register(): React.ReactElement {
  const { register, loading } = useAuthStore();
  const [form, setForm] = useState<RegisterFormState>({
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

  return (
    <RegisterPageView
      form={form}
      loading={loading}
      ready={ready}
      error={error}
      showPw={showPw}
      showConfirm={showConfirm}
      passwordsMatch={passwordsMatch}
      showPwdStatus={showPwdStatus}
      onChange={(next) => setForm((prev) => ({ ...prev, ...next }))}
      onTogglePw={() => setShowPw((s) => !s)}
      onToggleConfirm={() => setShowConfirm((s) => !s)}
      onSubmit={onSubmit}
      formatPhone={formatPhone}
    />
  );
}
