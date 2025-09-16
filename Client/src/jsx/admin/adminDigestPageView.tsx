import React from 'react';
import type { AdminDigestViewProps } from '../../types/admin/adminDigest.types.ts';

export default function AdminDigestPageView({
                                              days,
                                              subject,
                                              isLoading,
                                              updates,
                                              selected,
                                              onChangeDays,
                                              onChangeSubject,
                                              onToggleRow,
                                              onToggleAll,
                                              onSendAuto,
                                              onSendManual,
                                            }: AdminDigestViewProps): React.ReactElement {
  const daysInputId = 'digest-days';
  const subjectInputId = 'digest-subject';

  return (
    <div className="p-3 space-y-3">
      <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
        <div className="font-semibold mb-2">Prayer Digest</div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={daysInputId} className="text-sm font-medium text-[var(--theme-text)] opacity-80">
              Lookback Days (how far back to gather updates)
            </label>
            <input
              id={daysInputId}
              type="number"
              min={1}
              value={days}
              onChange={(e) => onChangeDays(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)]"
              placeholder="Days (default 7)"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={subjectInputId} className="text-sm font-medium text-[var(--theme-text)] opacity-80">
              Subject (optional — overrides default email subject)
            </label>
            <input
              id={subjectInputId}
              value={subject}
              onChange={(e) => onChangeSubject(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] placeholder-[var(--theme-placeholder)]"
              placeholder="Subject (optional)"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={onSendAuto}
            className="px-4 py-2 rounded-lg bg-[var(--theme-button)] text-[var(--theme-text-white)]
               hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]
               active:translate-y-0.5 active:shadow-inner transition-all"
          >
            Send Auto (Last {days} Days)
          </button>

          <button
            onClick={onSendManual}
            className="px-4 py-2 rounded-lg bg-[var(--theme-button)] text-[var(--theme-text-white)]
               hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]
               active:translate-y-0.5 active:shadow-inner transition-all"
          >
            Send Manual (Selected)
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)]">
        <div className="px-3 py-2 font-semibold border-b border-[var(--theme-border)] flex items-center justify-between">
          <span>Preview Updates</span>
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => onToggleAll(true)}
              className="px-2 py-1 rounded-lg bg-[var(--theme-button)] text-[var(--theme-text-white)]
                 hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]
                 shadow-md active:translate-y-0.5 active:shadow-inner transition-all"
            >
              Select All
            </button>
            <button
              onClick={() => onToggleAll(false)}
              className="px-2 py-1 rounded-lg bg-[var(--theme-button)] text-[var(--theme-text-white)]
                 hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]
                 shadow-md active:translate-y-0.5 active:shadow-inner transition-all"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--theme-strip)] text-[var(--theme-strip-text)]">
            <tr>
              <th className="px-3 py-2">Select</th>
              <th className="px-3 py-2 text-left">Prayer</th>
              <th className="px-3 py-2 text-left">Author</th>
              <th className="px-3 py-2 text-left">When</th>
              <th className="px-3 py-2 text-left">Updates</th>
            </tr>
            </thead>
            <tbody>
            {updates.map((u) => (
              <tr key={u.id} className="even:bg-[var(--theme-card-alt)] hover:bg-[var(--theme-card-hover)]">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={!!selected[u.id]}
                    onChange={(e) => onToggleRow(u.id, e.target.checked)}
                  />
                </td>
                <td className="px-3 py-2">{u.prayerTitle}</td>
                <td className="px-3 py-2">{u.authorName}</td>
                <td className="px-3 py-2">{new Date(u.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2 whitespace-pre-wrap">{u.content}</td>
              </tr>
            ))}

            {!updates.length && (
              <tr>
                <td colSpan={5} className="px-3 py-4 opacity-70">
                  {isLoading ? 'Loading…' : 'No updates to show.'}
                </td>
              </tr>
            )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
