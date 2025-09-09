// Client/src/pages/admin/AdminDigestPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { postDigestPreview, postDigestSendAuto, postDigestSendManual } from '../../helpers/api/adminApi';
import { useAuthStore } from '../../stores/useAuthStore';
// ✅ correct store file (matches your repo)
import { useAdminUiStore } from '../../stores/admin/useAdminUiStore';

type UpdateRow = {
  id: number;
  prayerId: number;
  prayerTitle: string;
  authorName: string;
  content: string;
  createdAt: string;
};

function getDefaultGroupId(userGroupId?: number | null, uiGroupId?: number | null): number {
  if (typeof uiGroupId === 'number' && uiGroupId > 0) return uiGroupId;
  if (typeof userGroupId === 'number' && userGroupId > 0) return userGroupId;
  return 1;
}

export default function AdminDigestPage(): React.ReactElement {
  const auth = useAuthStore();
  const ui = useAdminUiStore();

  const initialGroupId = useMemo(
    () => getDefaultGroupId(auth.user?.groupId ?? null, ui.groupId ?? null),
    [auth.user?.groupId, ui.groupId]
  );

  const [groupId, setGroupId] = useState<number>(initialGroupId);
  const [days, setDays] = useState<number>(7);
  const [updates, setUpdates] = useState<UpdateRow[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [subject, setSubject] = useState('');
  const [threadMessageId, setThreadMessageId] = useState<string>('');

  // keep groupId updated if the stores change
  useEffect(() => {
    setGroupId(initialGroupId);
  }, [initialGroupId]);

  // auto-refresh when groupId/days change
  useEffect(() => {
    void loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, days]);

  async function loadPreview() {
    const res = await postDigestPreview({ groupId, days });
    if (res && typeof res === 'object' && 'ok' in res && res.ok) {
      const rows = (res.updates as unknown[]).map((u: any) => ({
        ...u,
        createdAt: new Date(u.createdAt).toISOString(),
      }));
      setUpdates(rows);
      setSelected({});
    }
    // graceful no-op on failure
  }

  async function onSendAuto() {
    const res = await postDigestSendAuto({
      groupId,
      days,
      subject: subject || undefined,
      threadMessageId: threadMessageId || undefined,
    });
    if (res && typeof res === 'object' && 'ok' in res && res.ok) {
      if (res.messageId) setThreadMessageId(res.messageId);
    }
  }

  async function onSendManual() {
    const ids = updates.filter(u => selected[u.id]).map(u => u.id);
    if (!ids.length) return;
    const res = await postDigestSendManual({
      groupId,
      updateIds: ids,
      subject: subject || undefined,
      threadMessageId: threadMessageId || undefined,
    });
    if (res && typeof res === 'object' && 'ok' in res && res.ok) {
      if (res.messageId) setThreadMessageId(res.messageId);
    }
  }

  // input IDs for a11y labels
  const groupIdInputId = 'digest-group-id';
  const daysInputId = 'digest-days';
  const subjectInputId = 'digest-subject';
  const threadIdInputId = 'digest-thread-message-id';

  return (
    <div className="p-3 space-y-3">
      <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
        <div className="font-semibold mb-2">Prayer Digest</div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={groupIdInputId} className="text-sm font-medium text-[var(--theme-text)] opacity-80">
              Group ID (destination group for this digest)
            </label>
            <input
              id={groupIdInputId}
              type="number"
              min={1}
              value={groupId}
              onChange={e => {
                const val = Number(e.target.value);
                setGroupId(val);
                // keep the global admin UI store in sync so other admin pages use the same group
                if (Number.isFinite(val) && val > 0) ui.set({ groupId: val });
              }}
              className="px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)]"
              placeholder="Group ID"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={daysInputId} className="text-sm font-medium text-[var(--theme-text)] opacity-80">
              Lookback Days (how far back to gather updates)
            </label>
            <input
              id={daysInputId}
              type="number"
              min={1}
              value={days}
              onChange={e => setDays(Number(e.target.value))}
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
              onChange={e => setSubject(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] placeholder-[var(--theme-placeholder)]"
              placeholder="Subject (optional)"
            />
          </div>

          <div className="flex flex-col gap-1 md:col-span-2">
            <label htmlFor={threadIdInputId} className="text-sm font-medium text-[var(--theme-text)] opacity-80">
              Thread Message-ID (optional — continue an existing email thread)
            </label>
            <input
              id={threadIdInputId}
              value={threadMessageId}
              onChange={e => setThreadMessageId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] placeholder-[var(--theme-placeholder)]"
              placeholder="Thread Message-ID (optional)"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={loadPreview}
            className="px-4 py-2 rounded-lg bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]"
          >
            Refresh Preview
          </button>
          <button
            onClick={onSendAuto}
            className="px-4 py-2 rounded-lg bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]"
          >
            Send Auto (Last {days} Days)
          </button>
          <button
            onClick={onSendManual}
            className="px-4 py-2 rounded-lg bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]"
          >
            Send Manual (Selected)
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)]">
        <div className="px-3 py-2 font-semibold border-b border-[var(--theme-border)]">Preview Updates</div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--theme-strip)] text-[var(--theme-strip-text)]">
            <tr>
              <th className="px-3 py-2">Select</th>
              <th className="px-3 py-2 text-left">Prayer</th>
              <th className="px-3 py-2 text-left">Author</th>
              <th className="px-3 py-2 text-left">When</th>
              <th className="px-3 py-2 text-left">Content</th>
            </tr>
            </thead>
            <tbody>
            {updates.map(u => (
              <tr key={u.id} className="even:bg-[var(--theme-card-alt)] hover:bg-[var(--theme-card-hover)]">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected[u.id]}
                    onChange={e => setSelected(s => ({ ...s, [u.id]: e.target.checked }))}
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
                  No updates to show.
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
