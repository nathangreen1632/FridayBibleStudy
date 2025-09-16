// Client/src/pages/account/ProfileAccountLogic.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { api } from '../helpers/http.helper.ts';
import { loadRecaptchaEnterprise, getRecaptchaToken } from '../lib/recaptcha.lib.ts';
import { useAuthStore } from '../stores/useAuthStore.ts';
import { useUiStore } from '../stores/useUiStore.ts';
import ProfileAccountView from '../jsx/profile/profileAccountView.tsx';
import type { PrayerDraft } from '../types/admin/account.types.ts';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

export default function ProfileAccountLogic(): React.ReactElement {
  const {user, me, updateProfile, loading} = useAuthStore();
  const {openModal, closeModal, isOpen} = useUiStore();

  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);

  // NEW: dirty flag from ProfileForm + "show confirm" flag
  const [formDirty, setFormDirty] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  const [prayer, setPrayer] = useState<PrayerDraft>({
    title: '',
    content: '',
    category: '',
  });

  // ensure user is loaded
  useEffect(() => {
    (async () => {
      try {
        await me();
      } catch {
        // ignore or add logging if desired
      }
    })();
  }, [me]);

  const onSaveProfile = useCallback(
    async (values: Parameters<typeof updateProfile>[0]) => {
      try {
        setSaving(true);
        setSavedMsg(null);
        const {success, message} = await updateProfile(values);
        if (success) {
          await me(); // refresh store with latest DB user
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
    },
    [closeModal, me, updateProfile]
  );

  const openProfile = useCallback(() => {
    setConfirmExit(false);
    openModal('profile');
  }, [openModal]);

  const requestCloseProfile = useCallback(() => {
    if (formDirty) {
      setConfirmExit(true);
      return;
    }
    setConfirmExit(false);
    closeModal('profile');
  }, [closeModal, formDirty]);

  // Confirm bar handlers
  const confirmExitWithoutSaving = useCallback(() => {
    setConfirmExit(false);
    setFormDirty(false);
    closeModal('profile');
  }, [closeModal]);

  const cancelExit = useCallback(() => {
    setConfirmExit(false);
  }, []);

  const postPrayer = useCallback(
    async (e: React.FormEvent) => {
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
            recaptchaToken,
          }),
        });

        toast.success('Prayer posted!');
        setPrayer({title: '', content: '', category: ''});
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Failed to post prayer. Please try again.';
        toast.error(msg);
      } finally {
        setPosting(false);
      }
    },
    [prayer]
  );

  return (
    <ProfileAccountView
      user={user ?? null}
      loading={loading}
      saving={saving}
      posting={posting}
      savedMsg={savedMsg}
      formDirty={formDirty}
      confirmExit={confirmExit}
      prayer={prayer}
      setPrayer={setPrayer}
      isProfileOpen={isOpen('profile')}
      openProfile={openProfile}
      requestCloseProfile={requestCloseProfile}
      confirmExitWithoutSaving={confirmExitWithoutSaving}
      cancelExit={cancelExit}
      onSaveProfile={onSaveProfile}
      postPrayer={postPrayer}
      onDirtyChange={setFormDirty}   // ✅ NEW
    />
  );
}
