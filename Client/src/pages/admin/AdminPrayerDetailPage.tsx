// Client/src/pages/admin/AdminPrayerDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAdminStore } from '../../stores/admin/useAdminStore';
import { useAdminUiStore } from '../../stores/admin/useAdminUiStore';

type AdminStatus = 'active' | 'praise' | 'archived';

export default function AdminPrayerDetailPage(): React.ReactElement {
  const { id } = useParams();
  const prayerId = Number(id);

  const nav = useNavigate();
  const location = useLocation();
  const ui = useAdminUiStore();

  const { loadThread, detailComments, setStatus, addComment } = useAdminStore();

  const [content, setContent] = useState('');
  const [localStatus, setLocalStatus] = useState<AdminStatus>('active'); // default

  // IDs for label/control association
  const statusSelectId = 'admin-detail-status';
  const updateTextareaId = 'admin-detail-update';

  useEffect(() => {
    if (prayerId) {
      void loadThread(prayerId);
    }
  }, [prayerId, loadThread]);

  async function onPost() {
    const msg = content.trim();
    if (!msg) return;
    const res = await addComment(prayerId, msg);
    if (res.ok) setContent('');
  }

  async function onSetStatus() {
    await setStatus(prayerId, localStatus);
  }

  // Back button: restore list state if we arrived from the admin list
  function onBack() {
    const st = location.state as { from?: string; ui?: any } | null | undefined;

    const cameFromAdminList =
      !!st &&
      typeof st.from === 'string' &&
      st.from.startsWith('/admin') &&
      !st.from.includes('/prayers/');

    if (cameFromAdminList) {
      if (st.ui) ui.set(st.ui);
      nav('/admin', { replace: true });
      return;
    }

    // Fallback: browser back; if no history, Router will stay put
    nav(-1);
  }

  const items = detailComments[prayerId] ?? [];

  return (
    <div className="space-y-4">
      {/* Back button row */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)]
                     px-3 py-1.5 text-sm hover:bg-[var(--theme-card-hover)]"
        >
          ← Back to list
        </button>
      </div>

      <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl p-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div>
            <label htmlFor={statusSelectId} className="block text-sm mb-1">
              Status
            </label>
            <select
              id={statusSelectId}
              value={localStatus}
              onChange={(e) => setLocalStatus(e.target.value as AdminStatus)}
              className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] placeholder:text[var(--theme-placeholder)] px-3 py-2"
            >
              <option value="active">Prayer</option>
              <option value="praise">Praise</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <button
            onClick={onSetStatus}
            className="rounded-xl bg-[var(--theme-button)] text-[var(--theme-text-white)] px-4 py-2 hover:bg-[var(--theme-button-hover)]"
          >
            Update Status
          </button>
        </div>
      </div>

      <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl p-3">
        <h3 className="font-semibold mb-2">Add Admin Update</h3>

        {/* Accessible label for the textarea (screen-reader only) */}
        <label htmlFor={updateTextareaId} className="sr-only">
          Admin update content
        </label>
        <textarea
          id={updateTextareaId}
          className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] placeholder:[var(--theme-placeholder)] px-3 py-2"
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Post an admin update…"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={onPost}
            className="rounded-xl bg-[var(--theme-button-blue)] text-[var(--theme-text-white)] px-4 py-2 hover:bg-[var(--theme-button-blue-hover)]"
          >
            Post
          </button>
        </div>
      </div>

      <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl">
        <div className="p-3 font-semibold">Timeline</div>
        <ul className="divide-y divide-[var(--theme-border)]">
          {items.map((c: any) => (
            <li key={c.id} className="p-3">
              <div className="text-sm opacity-80">{new Date(c.createdAt).toLocaleString()}</div>
              <div>{c.content}</div>
            </li>
          ))}
          {!items.length && <li className="p-3">No updates yet.</li>}
        </ul>
      </div>
    </div>
  );
}
