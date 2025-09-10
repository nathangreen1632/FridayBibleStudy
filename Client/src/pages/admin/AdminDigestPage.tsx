// Client/src/pages/admin/AdminDigestPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  postDigestPreview,
  postDigestSendAuto,
  postDigestSendManual,
} from '../../helpers/api/adminApi';
import { useAuthStore } from '../../stores/useAuthStore';

type UpdateRow = {
  id: number;
  prayerId: number;
  prayerTitle: string;
  authorName: string;
  content: string;
  createdAt: string;
};

export default function AdminDigestPage(): React.ReactElement {
  const auth = useAuthStore();

  // Single group only: derive once from user or fallback to 1
  const groupId = useMemo(() => {
    const val = auth.user?.groupId;
    if (typeof val === 'number' && val > 0) return val;
    return 1;
  }, [auth.user?.groupId]);

  const [days, setDays] = useState<number>(7);
  const [updates, setUpdates] = useState<UpdateRow[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean | undefined>>({});
  const [subject, setSubject] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // auto-fetch preview when groupId/days change
  useEffect(() => {
    void loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, days]);

  async function loadPreview() {
    setIsLoading(true);
    try {
      const res = await postDigestPreview({ groupId, days });
      if (res && typeof res === 'object' && 'ok' in res && res.ok) {
        const rows = (res.updates as unknown[]).map((u: any) => ({
          ...u,
          createdAt: new Date(u.createdAt).toISOString(),
        }));
        setUpdates(rows);
        setSelected({});
      } else {
        // graceful no-op on failure
      }
    } catch {
      // graceful no-op on error
    } finally {
      setIsLoading(false);
    }
  }

  async function onSendAuto() {
    try {
      const res = await postDigestSendAuto({
        groupId,
        days,
        subject: subject || undefined,
      });
      if (res && typeof res === 'object' && 'ok' in res && res.ok) {
        toast.success('Digest sent (auto).');
      } else {
        toast.error('Failed to send digest.');
      }
    } catch {
      toast.error('Error sending digest.');
    }
  }

  async function onSendManual() {
    const ids = updates.filter((u) => selected[u.id]).map((u) => u.id);
    if (!ids.length) {
      toast.error('Select at least one update.');
      return;
    }
    try {
      const res = await postDigestSendManual({
        groupId,
        updateIds: ids,
        subject: subject || undefined,
      });
      if (res && typeof res === 'object' && 'ok' in res && res.ok) {
        toast.success('Digest sent (manual).');
      } else {
        toast.error('Failed to send digest.');
      }
    } catch {
      toast.error('Error sending digest.');
    }
  }

  // input IDs for a11y labels
  const daysInputId = 'digest-days';
  const subjectInputId = 'digest-subject';

  // small helper: select all / none
  function toggleSelectAll(next: boolean) {
    if (!updates.length) {
      setSelected({});
      return;
    }
    if (next) {
      const all: Record<number, boolean> = {};
      for (const u of updates) all[u.id] = true;
      setSelected(all);
    } else {
      setSelected({}); // or explicitly: Object.fromEntries(updates.map(u => [u.id, false]))
    }
  }

  return (
    <div className="p-3 space-y-3">
      <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
        <div className="font-semibold mb-2">Prayer Digest</div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor={daysInputId}
              className="text-sm font-medium text-[var(--theme-text)] opacity-80"
            >
              Lookback Days (how far back to gather updates)
            </label>
            <input
              id={daysInputId}
              type="number"
              min={1}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)]"
              placeholder="Days (default 7)"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor={subjectInputId}
              className="text-sm font-medium text-[var(--theme-text)] opacity-80"
            >
              Subject (optional — overrides default email subject)
            </label>
            <input
              id={subjectInputId}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
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
              onClick={() => toggleSelectAll(true)}
              className="px-2 py-1 rounded-lg bg-[var(--theme-button-blue)] text-[var(--theme-text-white)]
                 hover:bg-[var(--theme-button-blue-hover)]
                 shadow-md active:translate-y-0.5 active:shadow-inner transition-all"
            >
              Select All
            </button>
            <button
              onClick={() => toggleSelectAll(false)}
              className="px-2 py-1 rounded-lg bg-[var(--theme-button-gray)] text-[var(--theme-text-white)]
                 hover:bg-[var(--theme-button-blue-hover)]
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
              <tr
                key={u.id}
                className="even:bg-[var(--theme-card-alt)] hover:bg-[var(--theme-card-hover)]"
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={!!selected[u.id]}
                    onChange={(e) =>
                      setSelected((s) => ({ ...s, [u.id]: e.target.checked }))
                    }
                  />
                </td>
                <td className="px-3 py-2">{u.prayerTitle}</td>
                <td className="px-3 py-2">{u.authorName}</td>
                <td className="px-3 py-2">
                  {new Date(u.createdAt).toLocaleString()}
                </td>
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
