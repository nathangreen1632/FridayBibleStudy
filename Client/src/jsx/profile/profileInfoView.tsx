import React from 'react';
import type { FormValues } from '../../types/pages/profile.types.ts';

type Props = Readonly<{
  form: FormValues;
  savedMsg: string | null;
  onFieldChange: <K extends keyof FormValues>(key: K, value: FormValues[K]) => void;
  onPhoneChange: (raw: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}>;

export default function ProfileInfoView({
                                          form,
                                          savedMsg,
                                          onFieldChange,
                                          onPhoneChange,
                                          onSubmit,
                                        }: Props): React.ReactElement {
  return (
    <form id="profile-form" onSubmit={onSubmit} className="space-y-4">
      {/* Name */}
      <label className="block text-xs sm:text-sm font-medium">
        <span className="text-sm sm:text-base mb-1 block">Name</span>
        <input
          placeholder="Your full name"
          value={form.name}
          onChange={(e) => onFieldChange('name', e.currentTarget.value)}
          className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 text-sm sm:text-base
                     text-[var(--theme-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] placeholder:text-[var(--theme-placeholder)]"
        />
      </label>

      {/* Phone (strict format) */}
      <label className="block text-xs sm:text-sm font-medium">
        <span className="text-sm sm:text-base mb-1 block">Phone</span>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          maxLength={12}
          placeholder="555-123-4567"
          value={form.phone}
          onChange={(e) => onPhoneChange(e.currentTarget.value)}
          // keep pattern for layer of validation, but logic does the real check
          pattern="^\d{3}-\d{3}-\d{4}$"
          title="Format: 555-123-4567"
          className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 text-sm sm:text-base
                     text-[var(--theme-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] placeholder:text-[var(--theme-placeholder)]"
        />
      </label>

      {/* Street */}
      <label className="block text-xs sm:text-sm font-medium">
        <span className="text-sm sm:text-base mb-1 block">Street Address</span>
        <input
          placeholder="123 Main St"
          value={form.addressStreet}
          onChange={(e) => onFieldChange('addressStreet', e.currentTarget.value)}
          className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 text-sm sm:text-base
                     text-[var(--theme-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] placeholder:text-[var(--theme-placeholder)]"
        />
      </label>

      {/* City / State / ZIP */}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-xs sm:text-sm font-medium">
          <span className="text-sm sm:text-base mb-1 block">City</span>
          <input
            placeholder="City"
            value={form.addressCity}
            onChange={(e) => onFieldChange('addressCity', e.currentTarget.value)}
            className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 text-sm sm:text-base
                       text-[var(--theme-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] placeholder:text-[var(--theme-placeholder)]"
          />
        </label>

        <label className="block text-xs sm:text-sm font-medium">
          <span className="text-sm sm:text-base mb-1 block">State</span>
          <input
            placeholder="State"
            value={form.addressState}
            onChange={(e) => onFieldChange('addressState', e.currentTarget.value)}
            className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 text-sm sm:text-base
                       text-[var(--theme-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] placeholder:text-[var(--theme-placeholder)]"
          />
        </label>

        <label className="block text-xs sm:text-sm font-medium">
          <span className="text-sm sm:text-base mb-1 block">ZIP</span>
          <input
            placeholder="ZIP"
            value={form.addressZip}
            onChange={(e) => onFieldChange('addressZip', e.currentTarget.value)}
            className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 text-sm sm:text-base
                       text-[var(--theme-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] placeholder:text-[var(--theme-placeholder)]"
          />
        </label>
      </div>

      {/* Spouse */}
      <label className="block text-xs sm:text-sm font-medium">
        <span className="text-sm sm:text-base mb-1 block">Spouse Name (optional)</span>
        <input
          placeholder="Spouse name"
          value={form.spouseName}
          onChange={(e) => onFieldChange('spouseName', e.currentTarget.value)}
          className="block w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-textbox)] px-3 py-2 text-sm sm:text-base
                     text-[var(--theme-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus)] placeholder:text-[var(--theme-placeholder)]"
        />
      </label>

      {savedMsg ? <p className="text-xs sm:text-sm font-medium text-green-600 pt-1">{savedMsg}</p> : null}
    </form>
  );
}
