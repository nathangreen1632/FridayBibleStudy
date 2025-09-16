// Client/src/pages/admin/AdminPrayerDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { useAdminStore } from '../../stores/admin/useAdminStore';
import { useAdminUiStore } from '../../stores/admin/useAdminUiStore';
import { useAuthStore } from '../../stores/useAuthStore';

import AdminPrayerSummaryCard from '../../components/admin/AdminPrayerSummaryCardLogic.tsx';
import ConfirmBar from '../../common/ConfirmBar';
import { pressBtn } from '../../../ui/press.ts';

type AdminStatus = 'active' | 'praise' | 'archived';

export default function AdminPrayerDetailPage(): React.ReactElement {
  const { id } = useParams();
  const prayerId = Number(id);

  const nav = useNavigate();
  const location = useLocation();
  const ui = useAdminUiStore();

  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const { loadThread, detailComments, detailPrayers, setStatus, addComment } = useAdminStore();

  const [content, setContent] = useState('');
  const [localStatus, setLocalStatus] = useState<AdminStatus>('active'); // default

  // delete confirmation UI state (for whole prayer)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // IDs for label/control association
  const statusSelectId = 'admin-detail-status';
  const updateTextareaId = 'admin-detail-update';

  useEffect(() => {
    if (!prayerId) return;

    (async () => {
      try {
        await loadThread(prayerId);
      } catch {
        // eslint-disable-next-line no-console
        console.error('Failed to load prayer thread');
        toast.error('Failed to load prayer thread');
      }
    })();
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
    try {
      const res = await addComment(prayerId, msg);
      if (res?.ok) {
        setContent('');
        toast.success('Update posted.');
      } else {
        toast.error('Unable to post update.');
      }
    } catch {
      toast.error('Unable to post update.');
    }
  }

  async function onSetStatus() {
    try {
      await setStatus(prayerId, localStatus);
      toast.success('Status updated.');
    } catch {
      toast.error('Unable to update status.');
    }
  }

  // whole-prayer delete handlers
  function onClickDelete(): void {
    setShowDeleteConfirm(true);
  }

  async function onConfirmDelete(): Promise<void> {
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
      }

      // Fallback: archive if hard-delete isn’t available.
      await setStatus(prayerId, 'archived');
      setShowDeleteConfirm(false);
      onBack();
    } catch {
      // keep confirm visible; allow retry
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

  // ADMIN-ONLY per-update delete
  async function onDeleteUpdate(commentId: number): Promise<void> {
    if (!isAdmin) return;

    const state = useAdminStore.getState() as unknown as {
      deleteAdminComment?: (prayerIdParam: number, commentIdParam: number) => Promise<{ ok: boolean }>;
    };

    try {
      if (state && typeof state.deleteAdminComment === 'function') {
        const res = await state.deleteAdminComment(prayerId, commentId);
        if (res?.ok) {
          toast.success('Update deleted.');
          return;
        }
      }

      // Fallback direct API call
      const resp = await fetch(
        `/api/admin/prayers/${encodeURIComponent(prayerId)}/comments/${encodeURIComponent(commentId)}`,
        { method: 'DELETE', credentials: 'include', headers: { accept: 'application/json' } }
      );

      if (resp.ok) {
        toast.success('Update deleted.');
        await loadThread(prayerId); // ensure UI stays in sync
        return;
      }

      toast.error('Unable to delete update.');
    } catch {
      toast.error('Unable to delete update.');
    }
  }

  return (
    <div className="space-y-4">
      {/* Back button row */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className={pressBtn(
            'rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)] px-3 py-1.5 text-sm hover:text-[var(--theme-textbox)] hover:bg-[var(--theme-button-hover)] transition-colors duration-200'
          )}
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
              className={pressBtn(
                'rounded-xl bg-[var(--theme-button)] text-[var(--theme-text-white)] px-4 py-2 hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] transition-colors duration-200'
              )}
            >
              Update Status
            </button>

            <button
              type="button"
              onClick={onClickDelete}
              className={pressBtn(
                'rounded-xl bg-[var(--theme-error)] text-[var(--theme-textbox)] px-4 py-2 hover:bg-[var(--theme-button-error)] transition-colors duration-200'
              )}
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
            className={pressBtn(
              'rounded-xl bg-[var(--theme-button)] text-[var(--theme-text-white)] px-4 py-2 hover:text-[var(--theme-textbox)] hover:bg-[var(--theme-button-hover)] transition-colors duration-200'
            )}
          >
            Post
          </button>
        </div>
      </div>

      {/* Updates list with ADMIN-ONLY delete icon per update */}
      <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl">
        <div className="p-3 font-semibold">Updates</div>
        <ul className="divide-y divide-[var(--theme-border)]">
          {items.map((c: any) => (
            <li key={c.id} className="p-3 relative">
              <div className="text-sm opacity-80">{new Date(c.createdAt).toLocaleString()}</div>
              <div className="pr-10">{c.content}</div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => onDeleteUpdate(Number(c.id))}
                  className="absolute top-2 right-2 p-2 rounded-full"
                  aria-label="Delete update"
                  title="Delete update"
                >
                  <Trash2 size={22} className="opacity-80 text-[var(--theme-error)] hover:text-[var(--theme-button-error)] transition-colors duration-200" />
                </button>
              )}
            </li>
          ))}
          {!items.length && <li className="p-3">No updates yet.</li>}
        </ul>
      </div>
    </div>
  );
}
