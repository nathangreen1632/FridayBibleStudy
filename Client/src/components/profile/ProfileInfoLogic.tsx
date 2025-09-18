import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import type { ProfileFormProps, FormValues } from '../../types/pages/profile.types.ts';
import { normalizeFromUser, formatPhone, phoneRE } from '../../utils/profile.util.ts';
import ProfileInfoView from '../../jsx/profile/profileInfoView.tsx';

export default function ProfileInfoLogic({
                                           open,
                                           user,
                                           savedMsg,
                                           onSave,
                                           onDirtyChange,
                                         }: Readonly<ProfileFormProps>): React.ReactElement {
  const initial = useMemo(() => normalizeFromUser(user), [user]);
  const [form, setForm] = useState<FormValues>(initial);

  useEffect(() => {
    setForm(normalizeFromUser(user));
  }, [user]);

  useEffect(() => {
    if (open) setForm(normalizeFromUser(user));
  }, [open, user]);

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initial),
    [form, initial]
  );

  useEffect(() => {
    try {
      onDirtyChange?.(dirty);
    } catch {

    }
  }, [dirty, onDirtyChange]);

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) {
      toast('No changes to save.', { icon: 'ℹ️' });
      return;
    }

    if (form.phone && !phoneRE.test(form.phone)) {
      toast.error('Please enter your phone as 555-123-4567');
      return;
    }
    try {
      await onSave(form);
    } catch {

    }
  }

  return (
    <ProfileInfoView
      form={form}
      savedMsg={savedMsg ?? null}
      onFieldChange={setField}
      onPhoneChange={(raw) => setField('phone', formatPhone(raw))}
      onSubmit={handleSubmit}
    />
  );
}
