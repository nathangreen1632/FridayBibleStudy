// Client/src/pages/account/Profile.account.tsx
import React, { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useAuthStore } from '../../stores/auth.store';
import { api } from '../../helpers/http.helper';
import { loadRecaptchaEnterprise, getRecaptchaToken } from '../../lib/recaptcha.lib';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

type PrayerCategory = 'prayer' | 'long-term' | 'salvation' | 'pregnancy' | 'birth';

export default function ProfileAccount(): React.ReactElement {
  const { user, me, updateProfile, loading } = useAuthStore();

  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    addressStreet: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
    spouseName: ''
  });

  const [prayer, setPrayer] = useState<{
    title: string;
    content: string;
    category: PrayerCategory;
  }>({
    title: '',
    content: '',
    category: 'prayer'
  });

  useEffect(() => { void me(); }, [me]);

  useEffect(() => {
    if (user) {
      setForm(f => ({
        ...f,
        name: user.name ?? '',
        phone: (user as any).phone ?? '',
        addressStreet: (user as any).addressStreet ?? '',
        addressCity: (user as any).addressCity ?? '',
        addressState: (user as any).addressState ?? '',
        addressZip: (user as any).addressZip ?? '',
        spouseName: (user as any).spouseName ?? ''
      }));
    }
  }, [user]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setSavedMsg(null);
      const { success, message } = await updateProfile(form);
      if (success) {
        setSavedMsg('Profile saved');
        toast.success('Profile updated successfully!');
      } else {
        const msg = message ?? 'Save failed';
        setSavedMsg(msg);
        toast.error(msg);
      }
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(null), 2500);
    }
  }

  async function postPrayer(e: React.FormEvent) {
    e.preventDefault();
    try {
      setPosting(true);

      if (!SITE_KEY) {
        toast.error('Security not configured. Please contact support.');
        return;
      }

      await loadRecaptchaEnterprise(SITE_KEY);
      const recaptchaToken = await getRecaptchaToken(SITE_KEY, 'prayer_create');
      if (!recaptchaToken) {
        toast.error('Could not verify security check. Refresh and try again.');
        return;
      }

      await api('/api/prayers', {
        method: 'POST',
        body: JSON.stringify({ ...prayer, recaptchaToken })
      });

      toast.success('Prayer posted!');
      setPrayer({ title: '', content: '', category: 'prayer' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to post prayer. Please try again.';
      toast.error(msg);
    } finally {
      setPosting(false);
    }
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] bg-[var(--theme-bg)] text-[var(--theme-text)] flex items-center justify-center p-6">
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-[0_4px_14px_0_var(--theme-shadow)] px-6 py-5">
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[88vh] bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <Toaster position="top-center" reverseOrder={false} />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-8">

        {/* Profile Card */}
        <section className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-[0_4px_14px_0_var(--theme-shadow)] p-6 md:p-8">
          <header className="mb-6">
            <h2 className="text-2xl font-semibold text-[var(--theme-accent)] text-center sm:text-left">
              My Profile
            </h2>
            <p className="opacity-80 text-center sm:text-left">Update your contact and address details.</p>
          </header>

          <form onSubmit={saveProfile} className="space-y-4">
            {/* Name */}
            <label className="block text-sm font-medium">
              <span className="text-base mb-1 block">Name</span>
              <input
                placeholder="Your full name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2
                           text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]"
              />
            </label>

            {/* Phone */}
            <label className="block text-sm font-medium">
              <span className="text-base mb-1 block">Phone</span>
              <input
                placeholder="555-123-4567"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2
                           text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]"
              />
            </label>

            {/* Street */}
            <label className="block text-sm font-medium">
              <span className="text-base mb-1 block">Street Address</span>
              <input
                placeholder="123 Main St"
                value={form.addressStreet}
                onChange={e => setForm({ ...form, addressStreet: e.target.value })}
                className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2
                           text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]"
              />
            </label>

            {/* City / State / ZIP */}
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm font-medium">
                <span className="text-base mb-1 block">City</span>
                <input
                  placeholder="City"
                  value={form.addressCity}
                  onChange={e => setForm({ ...form, addressCity: e.target.value })}
                  className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2
                             text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]"
                />
              </label>

              <label className="block text-sm font-medium">
                <span className="text-base mb-1 block">State</span>
                <input
                  placeholder="State"
                  value={form.addressState}
                  onChange={e => setForm({ ...form, addressState: e.target.value })}
                  className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2
                             text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]"
                />
              </label>

              <label className="block text-sm font-medium">
                <span className="text-base mb-1 block">ZIP</span>
                <input
                  placeholder="ZIP"
                  value={form.addressZip}
                  onChange={e => setForm({ ...form, addressZip: e.target.value })}
                  className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2
                             text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]"
                />
              </label>
            </div>

            {/* Spouse */}
            <label className="block text-sm font-medium">
              <span className="text-base mb-1 block">Spouse Name (optional)</span>
              <input
                placeholder="Spouse name"
                value={form.spouseName}
                onChange={e => setForm({ ...form, spouseName: e.target.value })}
                className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2
                           text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]"
              />
            </label>

            {/* Save */}
            <div className="pt-2">
              <button
                className="w-full sm:w-auto rounded-xl bg-[var(--theme-button)] px-5 py-2.5 text-[var(--theme-text-white)] font-semibold
                           hover:bg-[var(--theme-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={loading || saving}
                type="submit"
              >
                {loading || saving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>

            {savedMsg && (
              <p className="text-sm font-medium text-green-600 pt-1">{savedMsg}</p>
            )}
          </form>
        </section>

        {/* Post a Prayer Card */}
        <section className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-[0_4px_14px_0_var(--theme-shadow)] p-6 md:p-8">
          <header className="mb-6">
            <h2 className="text-2xl font-semibold text-[var(--theme-accent)] text-center sm:text-left">
              Post a Prayer
            </h2>
            <p className="opacity-80 text-center sm:text-left">Share a prayer request or praise with the group.</p>
          </header>

          <form className="space-y-4" onSubmit={postPrayer}>
            {/* Title */}
            <label className="block text-sm font-medium">
              <span className="text-base mb-1 block">Title</span>
              <input
                required
                placeholder="Brief title"
                value={prayer.title}
                onChange={e => setPrayer({ ...prayer, title: e.target.value })}
                className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2
                           text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]"
              />
            </label>

            {/* Category */}
            <label className="block text-sm font-medium">
              <span className="text-base mb-1 block">Category</span>
              <select
                value={prayer.category}
                onChange={e => setPrayer({ ...prayer, category: e.target.value as PrayerCategory })}
                className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2
                           text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]"
              >
                <option value="prayer">Prayer</option>
                <option value="long-term">Long-term</option>
                <option value="salvation">Salvation</option>
                <option value="pregnancy">Pregnancy</option>
                <option value="birth">Birth / Praise</option>
              </select>
            </label>

            {/* Content */}
            <label className="block text-sm font-medium">
              <span className="text-base mb-1 block">Content</span>
              <textarea
                required
                rows={5}
                placeholder="Write your prayer or praise here…"
                value={prayer.content}
                onChange={e => setPrayer({ ...prayer, content: e.target.value })}
                className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2
                           text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]"
              />
            </label>

            {/* Post */}
            <div className="pt-2">
              <button
                className="w-full sm:w-auto rounded-xl bg-[var(--theme-button)] px-5 py-2.5 text-[var(--theme-text-white)] font-semibold
                           hover:bg-[var(--theme-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
                type="submit"
                disabled={posting}
              >
                {posting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
