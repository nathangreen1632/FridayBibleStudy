// Client/src/pages/contact/ContactForm.logic.tsx
import React, { useEffect, useState } from 'react';
import ContactFormView from '../../components/contact/ContactForm.view';
import { api } from '../../helpers/http.helper';
import { loadRecaptchaEnterprise, getRecaptchaToken } from '../../lib/recaptcha.lib';
import toast from 'react-hot-toast';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

type ContactPayload = {
  name: string;
  email: string;
  message: string;
};

type PostResponse = { ok: boolean; error?: string };

export default function ContactFormLogic(): React.ReactElement {
  const [form, setForm] = useState<ContactPayload>({
    name: '',
    email: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // load reCAPTCHA Enterprise early
  useEffect(() => {
    if (!SITE_KEY) return;
    loadRecaptchaEnterprise(SITE_KEY).catch(() => {
      // non-fatal — user can retry submit, we’ll attempt token again then
    });
  }, []);

  function onChange<K extends keyof ContactPayload>(key: K, value: ContactPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(): Promise<void> {
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Please fill out all fields.');
      return;
    }

    setSubmitting(true);
    try {
      // try to get a token (action name must match server guard)
      const recaptchaToken = SITE_KEY
        ? await getRecaptchaToken(SITE_KEY, 'contact_submit').catch(() => undefined)
        : undefined;

      const res = await api<PostResponse>('/api/contact/submit', {
        method: 'POST',
        headers: recaptchaToken ? { 'x-recaptcha-token': recaptchaToken } : {},
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast.success('Thanks! Your message was sent.');
        setForm({ name: '', email: '', message: '' });
      } else {
        toast.error(res.error || 'Unable to send message right now.');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[88vh] bg-[var(--theme-bg)] text-[var(--theme-text)] flex items-start sm:items-center justify-center p-3 sm:p-6">
      <ContactFormView
        form={form}
        submitting={submitting}
        onChange={onChange}
        onSubmit={onSubmit}
      />
    </div>
  );
}
