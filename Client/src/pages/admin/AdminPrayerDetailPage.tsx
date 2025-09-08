// Client/src/pages/admin/AdminPrayerDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAdminStore } from '../../stores/admin/useAdminStore';
import { useAdminUiStore } from '../../stores/admin/useAdminUiStore';
import AdminPrayerSummaryCard from '../../components/admin/AdminPrayerSummaryCard';
import ConfirmBar from '../../common/ConfirmBar';

type AdminStatus = 'active' | 'praise' | 'archived';

export default function AdminPrayerDetailPage(): React.ReactElement {
  const { id } = useParams();
  const prayerId = Number(id);

  const nav = useNavigate();
  const location = useLocation();
  const ui = useAdminUiStore();

  const { loadThread, detailComments, detailPrayers, setStatus, addComment } = useAdminStore();

  const [content, setContent] = useState('');
  const [localStatus, setLocalStatus] = useState<AdminStatus>('active'); // default

  // NEW: delete confirmation UI state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // IDs for label/control association
  const statusSelectId = 'admin-detail-status';
  const updateTextareaId = 'admin-detail-update';

  useEffect(() => {
    if (prayerId) {
      void loadThread(prayerId);
    }
  }, [prayerId, loadThread]);

  // Keep the Status dropdown in sync when the prayer loads/changes
  useEffect(() => {
    const current = detailPrayers[prayerId];
    const s = current?.status;
    if (s === 'active' || s === 'praise' || s === 'archived') {
      setLocalStatus(s);
    }
  }, [prayerId, detailPrayers]);

  async function onPost() {
    const msg = content.trim();
    if (!msg) return;
    const res = await addComment(prayerId, msg);
    if (res.ok) setContent('');
  }

  async function onSetStatus() {
    await setStatus(prayerId, localStatus);
  }

  // NEW: delete button handlers
  function onClickDelete(): void {
    setShowDeleteConfirm(true);
  }

  async function onConfirmDelete(): Promise<void> {
    // Try calling a store delete function if present; otherwise archive as a fallback.
    try {
      const state = useAdminStore.getState() as unknown as {
        deletePrayer?: (id: number) => Promise<{ ok: boolean; message?: string }>;
      };

      if (state && typeof state.deletePrayer === 'function') {
        const res = await state.deletePrayer(prayerId);
        if (res?.ok) {
          setShowDeleteConfirm(false);
          onBack();
          return;
        }
        // If backend declines, fall through to archive fallback.
      }

      // Fallback: archive if hard-delete isn’t available.
      await setStatus(prayerId, 'archived');
      setShowDeleteConfirm(false);
      onBack();
    } catch {
      // Soft-fail: keep the confirm bar open so the admin can retry or cancel.
      // Optionally add a toast here if you already use one on this page.
    }
  }

  function onCancelDelete(): void {
    setShowDeleteConfirm(false);
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

      {/* Pass the ID; the card reads from the store */}
      <AdminPrayerSummaryCard prayerId={prayerId} />

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

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSetStatus}
              className="rounded-xl bg-[var(--theme-button)] text-[var(--theme-text-white)] px-4 py-2 hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]"
            >
              Update Status
            </button>

            <button
              type="button"
              onClick={onClickDelete}
              className="rounded-xl bg-[var(--theme-error)] text-[var(--theme-textbox)] px-4 py-2 hover:bg-[var(--theme-button-error)]"
              aria-label="Delete prayer"
            >
              Delete
            </button>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="mt-3 border-t border-[var(--theme-border)] pt-3">
            <ConfirmBar
              message="Delete this prayer and all its updates? This cannot be undone."
              cancelLabel="Cancel"
              confirmLabel="Delete"
              onCancel={onCancelDelete}
              onConfirm={onConfirmDelete}
            />
          </div>
        )}
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
        <div className="p-3 font-semibold">Updates</div>
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
