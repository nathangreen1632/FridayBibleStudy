//Client/src/components/account/ProfileForm.tsx
import React, { useEffect, useMemo, useState } from 'react';
import type { User } from '../../types/domain.types'; // adjust if your User type lives elsewhere

type FormValues = {
  name: string;
  phone: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  spouseName: string;
};

type ProfileFormProps = {
  user: User;
  savedMsg?: string | null;
  onSave: (values: FormValues) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
};

function normalizeFromUser(user: User): FormValues {
  const name =
    user.name?.trim().length && user.name.trim().toLowerCase() !== 'user'
      ? user.name
      : '';

  // these casts match your existing usage of (user as any)
  return {
    name,
    phone: (user as any).phone ?? '',
    addressStreet: (user as any).addressStreet ?? '',
    addressCity: (user as any).addressCity ?? '',
    addressState: (user as any).addressState ?? '',
    addressZip: (user as any).addressZip ?? '',
    spouseName: (user as any).spouseName ?? '',
  };
}

export default function ProfileForm({
                                      user,
                                      savedMsg,
                                      onSave,
                                      onDirtyChange,
                                    }: Readonly<ProfileFormProps>): React.ReactElement {
  const initial = useMemo(() => normalizeFromUser(user), [user]);
  const [form, setForm] = useState<FormValues>(initial);

  useEffect(() => {
    // Whenever the modal opens with a newer user snapshot, re-seed.
    setForm(normalizeFromUser(user));
  }, [user]);

  const dirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initial);
  }, [form, initial]);

  useEffect(() => {
    if (onDirtyChange) onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(form);
  }

  return (
    <form id="profile-form" onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <label className="block text-xs sm:text-sm font-medium">
        <span className="text-sm sm:text-base mb-1 block">Name</span>
        <input
          placeholder="Your full name"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm sm:text-base
                     text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]"
        />
      </label>

      {/* Phone */}
      <label className="block text-xs sm:text-sm font-medium">
        <span className="text-sm sm:text-base mb-1 block">Phone</span>
        <input
          placeholder="555-123-4567"
          value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })}
          className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm sm:text-base
                     text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]"
        />
      </label>

      {/* Street */}
      <label className="block text-xs sm:text-sm font-medium">
        <span className="text-sm sm:text-base mb-1 block">Street Address</span>
        <input
          placeholder="123 Main St"
          value={form.addressStreet}
          onChange={e => setForm({ ...form, addressStreet: e.target.value })}
          className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm sm:text-base
                     text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]"
        />
      </label>

      {/* City / State / ZIP */}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-xs sm:text-sm font-medium">
          <span className="text-sm sm:text-base mb-1 block">City</span>
          <input
            placeholder="City"
            value={form.addressCity}
            onChange={e => setForm({ ...form, addressCity: e.target.value })}
            className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm sm:text-base
                       text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]"
          />
        </label>

        <label className="block text-xs sm:text-sm font-medium">
          <span className="text-sm sm:text-base mb-1 block">State</span>
          <input
            placeholder="State"
            value={form.addressState}
            onChange={e => setForm({ ...form, addressState: e.target.value })}
            className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm sm:text-base
                       text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]"
          />
        </label>

        <label className="block text-xs sm:text-sm font-medium">
          <span className="text-sm sm:text-base mb-1 block">ZIP</span>
          <input
            placeholder="ZIP"
            value={form.addressZip}
            onChange={e => setForm({ ...form, addressZip: e.target.value })}
            className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm sm:text-base
                       text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]"
          />
        </label>
      </div>

      {/* Spouse */}
      <label className="block text-xs sm:text-sm font-medium">
        <span className="text-sm sm:text-base mb-1 block">Spouse Name (optional)</span>
        <input
          placeholder="Spouse name"
          value={form.spouseName}
          onChange={e => setForm({ ...form, spouseName: e.target.value })}
          className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm sm:text-base
                     text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)]"
        />
      </label>

      {savedMsg && <p className="text-xs sm:text-sm font-medium text-green-600 pt-1">{savedMsg}</p>}
    </form>
  );
}
