import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { apiWithRecaptcha } from '../../helpers/secure-api.helper.ts';
import RequestResetPageView from '../../jsx/auth/requestResetPageView.tsx';

export default function RequestResetPage(): React.ReactElement {
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
        nav(`/reset-password?email=${encodeURIComponent(email)}`, {
          replace: true,
          state: { email },
        });
        return;
      }

      let msg = 'Unable to request reset right now.';

      if (res && typeof res === 'object' && 'error' in res) {
        if (typeof res.error === 'string') {
          msg = res.error;
        } else {
          try {
            msg = JSON.stringify(res.error);
          } catch {
            msg = 'An unknown error occurred.';
          }
        }
      }

      toast.error(msg);
    } catch {
      toast.error('Network error while requesting reset.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RequestResetPageView
      email={email}
      ready={ready}
      submitting={submitting}
      valid={valid}
      onChangeEmail={setEmail}
      onSubmit={onSubmit}
    />
  );
}
