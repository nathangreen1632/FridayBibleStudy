// Client/src/pages/ResetPasswordPageLogic.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { apiWithRecaptcha } from '../../helpers/secure-api.helper.ts';
import { submitResetPassword, type ResetPayload } from '../../helpers/resetPassword.helper.ts';
import ResetPasswordPageView from '../../jsx/auth/resetPasswordPageView.tsx';
import type { ResetFormState } from '../../types/pages/resetPassword.types.ts';

export default function ResetPasswordPage(): React.ReactElement {
  const nav = useNavigate();
  const loc = useLocation();

  const [form, setForm] = useState<ResetFormState>({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // seed email from route state or query
  useEffect(() => {
    const stateEmail =
      (loc.state && typeof loc.state === 'object' && 'email' in (loc.state))
        ? String((loc.state as { email?: string }).email ?? '')
        : '';

    const sp = new URLSearchParams(loc.search);
    const queryEmail = sp.get('email') || '';

    const first = stateEmail || queryEmail;
    if (first) setForm((f) => ({ ...f, email: first }));
  }, [loc.state, loc.search]);

  const passwordsMatch = useMemo(() => {
    if (!form.newPassword || !form.confirmPassword) return false;
    return form.newPassword === form.confirmPassword;
  }, [form.newPassword, form.confirmPassword]);

  // format xxx-xxx while keeping digits only in state
  function formatOtp(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    if (digits.length <= 3) return digits;
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  const valid = useMemo(() => {
    if (!form.email?.includes('@')) return false;
    if (form.otp.length !== 6) return false; // require full 6-digit OTP
    return passwordsMatch;
  }, [form.email, passwordsMatch, form.otp.length]);

  const showPwdStatus = useMemo(
    () => form.newPassword.length > 0 || form.confirmPassword.length > 0,
    [form.newPassword.length, form.confirmPassword.length]
  );

  useEffect(() => {
    // secure-api.helper handles reCAPTCHA init internally; we just gate UI to avoid double submits
    setReady(true);
  }, []);

  function update<K extends keyof ResetFormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!valid) {
      toast.error('Please check your inputs.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: ResetPayload = {
        email: form.email,
        otp: form.otp,
        newPassword: form.newPassword,
      };

      const result = await submitResetPassword(apiWithRecaptcha, payload);

      if (result.ok) {
        toast.success('Password updated. You can log in now.');
        nav('/login');
        return;
      }

      toast.error(result.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ResetPasswordPageView
      form={form}
      submitting={submitting}
      ready={ready}
      passwordsMatch={passwordsMatch}
      showPwdStatus={showPwdStatus}
      showNew={showNew}
      showConfirm={showConfirm}
      valid={valid}
      update={update}
      onSubmit={onSubmit}
      onToggleShowNew={() => setShowNew((v) => !v)}
      onToggleShowConfirm={() => setShowConfirm((v) => !v)}
      formatOtp={formatOtp}
    />
  );
}
