// Client/src/pages/account/Profile.account.tsx
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ChevronDown } from 'lucide-react';
import type { Category } from '../types/domain.types.ts';
import { api } from '../helpers/http.helper.ts';
import { loadRecaptchaEnterprise, getRecaptchaToken } from '../lib/recaptcha.lib.ts';
import { useAuthStore } from '../stores/useAuthStore.ts';
import { useUiStore } from '../stores/useUiStore.ts';
import Modal from '../modals/Modal.tsx';
import ConfirmBar from '../common/ConfirmBar.tsx';
import ProfileInfo from '../components/ProfileInfo.tsx';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

// allow empty string for the placeholder until a real selection is made
type CategoryOption = Category | '';

export default function AccountPage(): React.ReactElement {
  const { user, me, updateProfile, loading } = useAuthStore();
  const { openModal, closeModal, isOpen } = useUiStore();

  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);

  // NEW: dirty flag from ProfileForm + "show confirm" flag
  const [formDirty, setFormDirty] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  const [prayer, setPrayer] = useState<{
    title: string;
    content: string;
    category: CategoryOption;
  }>({
    title: '',
    content: '',
    category: '' // default to placeholder "Select Prayer Type"
  });

  useEffect(() => { void me(); }, [me]);

  async function onSaveProfile(values: Parameters<typeof updateProfile>[0]) {
    try {
      setSaving(true);
      setSavedMsg(null);
      const { success, message } = await updateProfile(values);
      if (success) {
        // ⬇️ ensure store has the latest user from DB
        await me();

        setSavedMsg('Profile saved');
        toast.success('Profile updated successfully!');
        setFormDirty(false);
        setConfirmExit(false);
        closeModal('profile');
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

  function openProfile() {
    setConfirmExit(false);
    openModal('profile');
  }

  /** Called by ESC via Modal.onRequestClose, or by the "Close" button */
  function requestCloseProfile() {
    if (formDirty) {
      setConfirmExit(true);
      return;
    }
    setConfirmExit(false);
    closeModal('profile');
  }

  /** Confirm bar handlers */
  function confirmExitWithoutSaving() {
    setConfirmExit(false);
    setFormDirty(false);
    closeModal('profile');
  }
  function cancelExit() {
    setConfirmExit(false);
  }

  async function postPrayer(e: React.FormEvent) {
    e.preventDefault();

    // Extra-safe guard: ensure a real category was chosen
    if (prayer.category === '') {
      toast.error('Please select a prayer type.');
      return;
    }

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
        body: JSON.stringify({
          ...prayer,
          category: prayer.category, // safe now — not ''
          recaptchaToken
        })
      });

      toast.success('Prayer posted!');
      setPrayer({ title: '', content: '', category: '' }); // reset to placeholder
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to post prayer. Please try again.';
      toast.error(msg);
    } finally {
      setPosting(false);
    }
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] bg-[var(--theme-bg)] text-[var(--theme-text)] flex items-center justify-center p-4 sm:p-6">
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-[0_4px_14px_0_var(--theme-shadow)] px-4 py-3 sm:px-6 sm:py-5 text-sm sm:text-base">
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <div className="mx-auto max-w-4xl px-3 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* Page Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--theme-accent)]">Account</h1>
            <p className="opacity-80 text-sm sm:text-base">Manage your information and share prayers.</p>
          </div>
          <button
            type="button"
            onClick={openProfile}
            className="rounded-xl bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] px-4 py-2 text-sm sm:text-base"
          >
            Edit My Profile
          </button>
        </header>

        {/* Post a Prayer */}
        <section className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-md md:shadow-[0_4px_14px_0_var(--theme-shadow)] p-4 sm:p-6 md:p-8">
          <header className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl text-center font-semibold text-[var(--theme-accent)] sm:text-center">
              Post a Prayer
            </h2>
            <p className="opacity-80 text-center sm:text-center text-sm sm:text-base">Share a prayer request or praise with the group</p>
          </header>

          <form className="space-y-4" onSubmit={postPrayer}>
            {/* Title */}
            <label className="block text-xs sm:text-sm font-medium">
              <span className="text-sm sm:text-base mb-1 block">Title</span>
              <input
                required
                placeholder="Brief title"
                value={prayer.title}
                onChange={e => setPrayer({ ...prayer, title: e.target.value })}
                className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 text-sm sm:text-base
                           text-[var(--theme-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] placeholder:text-[var(--theme-placeholder)]/80"
              />
            </label>

            {/* Category with Lucide chevron */}
            <label className="block text-xs sm:text-sm font-medium">
              <span className="text-sm sm:text-base mb-1 block">Category</span>

              <div className="relative">
                <select
                  required
                  value={prayer.category}
                  onChange={e =>
                    setPrayer({ ...prayer, category: e.target.value as CategoryOption })
                  }
                  className={[
                    'block w-full appearance-none pr-10 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2',
                    'text-sm sm:text-base',
                    // ↓ when empty, show faded placeholder; otherwise normal text
                    !prayer.category
                      ? 'text-[var(--theme-placeholder)]/70'
                      : 'text-[var(--theme-placeholder)]',
                    'focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]',
                  ].join(' ')}
                >
                  {/* Disabled placeholder shows greyed in the dropdown, and as the initial value */}
                  <option value="">
                    Select Prayer Type
                  </option>
                  <option value="birth">Birth</option>
                  <option value="long-term">Long-term</option>
                  <option value="praise">Praise</option>
                  <option value="prayer">Prayer</option>
                  <option value="pregnancy">Pregnancy</option>
                  <option value="salvation">Salvation</option>
                </select>

                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--theme-placeholder)]"
                  aria-hidden="true"
                />
              </div>
            </label>


            {/* Content */}
            <label className="block text-xs sm:text-sm font-medium">
              <span className="text-sm sm:text-base mb-1 block">Content</span>
              <textarea
                required
                rows={5}
                placeholder="Write your prayer or praise here…"
                value={prayer.content}
                onChange={e => setPrayer({ ...prayer, content: e.target.value })}
                className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 text-sm sm:text-base leading-relaxed
                           text-[var(--theme-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] placeholder:text-[var(--theme-placeholder)]/70 custom-scrollbar"
              />
            </label>

            {/* Post */}
            <div className="pt-2">
              <button
                className="w-full sm:w-auto rounded-xl bg-[var(--theme-button)] px-5 py-2.5 text-[var(--theme-text-white)] text-sm sm:text-base font-semibold
                           hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] disabled:opacity-60 disabled:cursor-not-allowed"
                type="submit"
                disabled={posting}
              >
                {posting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* Profile Modal */}
      <Modal
        open={isOpen('profile')}
        onRequestClose={requestCloseProfile}  // ESC → asks first if dirty
        title="My Profile"
        footer={
          confirmExit ? (
            <ConfirmBar
              onCancel={cancelExit}
              onConfirm={confirmExitWithoutSaving}
              message="You have unsaved changes. Exit without saving?"
              cancelLabel="Keep editing"
              confirmLabel="Exit without saving"
            />
          ) : (
            <>
              <button
                className="rounded-xl bg-[var(--theme-button)] text-[var(--theme-text-white)] px-4 py-2 hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]"
                type="button"
                onClick={requestCloseProfile}
              >
                Close
              </button>
              <button
                className="rounded-xl bg-[var(--theme-button)] text-[var(--theme-text-white)] px-4 py-2 hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] disabled:opacity-60 disabled:cursor-not-allowed"
                type="submit"
                form="profile-form"
                disabled={loading || saving || !formDirty}
                aria-disabled={loading || saving || !formDirty}
              >
                {loading || saving ? 'Saving…' : 'Save Profile'}
              </button>
            </>
          )
        }
      >
        <p className="text-center opacity-80 text-sm sm:text-base mb-4">Update your contact and address details.</p>
        <ProfileInfo
          open={isOpen('profile')}           // ⬅️ tell the form when it opens
          user={user as any}
          savedMsg={savedMsg}
          onSave={onSaveProfile}
          onDirtyChange={setFormDirty}
        />
      </Modal>
    </div>
  );
}
