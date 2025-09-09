import React, { useEffect, useState } from 'react';
import { postDigestPreview, postDigestSendAuto, postDigestSendManual } from '../../helpers/api/adminApi';

type UpdateRow = { id: number; prayerId: number; prayerTitle: string; authorName: string; content: string; createdAt: string };

export default function AdminDigestPage(): React.ReactElement {
  const [groupId, setGroupId] = useState<number>(1); // TODO: default to admin’s group or selection
  const [days, setDays] = useState<number>(7);
  const [updates, setUpdates] = useState<UpdateRow[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [subject, setSubject] = useState('');
  const [threadMessageId, setThreadMessageId] = useState<string>('');

  useEffect(() => { void loadPreview(); }, []);

  async function loadPreview() {
    const res = await postDigestPreview({ groupId, days });
    if (res && res.ok) {
      const rows = (res.updates as any[]).map(u => ({ ...u, createdAt: new Date(u.createdAt).toISOString() }));
      setUpdates(rows);
      setSelected({});
    }
  }

  async function onSendAuto() {
    const res = await postDigestSendAuto({ groupId, days, subject: subject || undefined, threadMessageId: threadMessageId || undefined });
    // show toast if you have one; keep graceful
    if (res && res.ok) { setThreadMessageId(res.messageId ?? threadMessageId); }
  }

  async function onSendManual() {
    const ids = updates.filter(u => selected[u.id]).map(u => u.id);
    const res = await postDigestSendManual({ groupId, updateIds: ids, subject: subject || undefined, threadMessageId: threadMessageId || undefined });
    if (res && res.ok) { setThreadMessageId(res.messageId ?? threadMessageId); }
  }

  return (
    <div className="p-3 space-y-3">
      <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
        <div className="font-semibold mb-2">Prayer Digest</div>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          <input
            type="number" min={1}
            value={groupId}
            onChange={e => setGroupId(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)]"
            placeholder="Group ID"
          />
          <input
            type="number" min={1}
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)]"
            placeholder="Days (default 7)"
          />
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)]"
            placeholder="Subject (optional)"
          />
          <input
            value={threadMessageId}
            onChange={e => setThreadMessageId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)]"
            placeholder="Thread Message-ID (optional)"
          />
        </div>

        <div className="mt-3 flex gap-2">
          <button onClick={loadPreview} className="px-4 py-2 rounded-lg bg-[var(--theme-button-gray)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)]">
            Refresh Preview
          </button>
          <button onClick={onSendAuto} className="px-4 py-2 rounded-lg bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)]">
            Send Auto (Last {days} Days)
          </button>
          <button onClick={onSendManual} className="px-4 py-2 rounded-lg bg-[var(--theme-button-blue)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-blue-hover)]">
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
                    checked={!!selected[u.id]}
                    onChange={(e) => setSelected(s => ({ ...s, [u.id]: e.target.checked }))}
                  />
                </td>
                <td className="px-3 py-2">{u.prayerTitle}</td>
                <td className="px-3 py-2">{u.authorName}</td>
                <td className="px-3 py-2">{new Date(u.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2 whitespace-pre-wrap">{u.content}</td>
              </tr>
            ))}
            {!updates.length && (
              <tr><td colSpan={5} className="px-3 py-4 opacity-70">No updates to show.</td></tr>
            )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
