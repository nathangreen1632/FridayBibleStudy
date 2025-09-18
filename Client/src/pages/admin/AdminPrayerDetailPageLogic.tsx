import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAdminStore } from '../../stores/admin/useAdminStore';
import { useAdminUiStore } from '../../stores/admin/useAdminUiStore';
import { useAuthStore } from '../../stores/useAuthStore';
import AdminPrayerSummaryCard from '../../components/admin/AdminPrayerSummaryCardLogic.tsx';
import AdminPrayerDetailPageView from '../../jsx/admin/adminPrayerDetailPageView';
import type { AdminStatus } from '../../types/admin/adminPrayerDetail.types.ts';

export default function AdminPrayerDetailPageLogic(): React.ReactElement {
  const { id } = useParams();
  const prayerId = Number(id);

  const nav = useNavigate();
  const location = useLocation();
  const ui = useAdminUiStore();

  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const { loadThread, detailComments, detailPrayers, setStatus, addComment } = useAdminStore();

  const [content, setContent] = useState('');
  const [localStatus, setLocalStatus] = useState<AdminStatus>('active');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const statusSelectId = 'admin-detail-status';
  const updateTextareaId = 'admin-detail-update';

  useEffect(() => {
    if (!prayerId) return;
    (async () => {
      try {
        await loadThread(prayerId);
      } catch {
        console.error('Failed to load prayer thread');
        toast.error('Failed to load prayer thread');
      }
    })();
  }, [prayerId, loadThread]);

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

      await setStatus(prayerId, 'archived');
      setShowDeleteConfirm(false);
      onBack();
    } catch {
      console.error('Failed to delete prayer', prayerId);
      toast.error('Failed to delete prayer.');
    }
  }

  function onCancelDelete(): void {
    setShowDeleteConfirm(false);
  }

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

    nav(-1);
  }

  const items = (detailComments[prayerId] ?? []) as Array<{ id: number; createdAt: string; content: string }>;

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

      const resp = await fetch(
        `/api/admin/prayers/${encodeURIComponent(prayerId)}/comments/${encodeURIComponent(commentId)}`,
        { method: 'DELETE', credentials: 'include', headers: { accept: 'application/json' } }
      );

      if (resp.ok) {
        toast.success('Update deleted.');
        await loadThread(prayerId);
        return;
      }

      toast.error('Unable to delete update.');
    } catch {
      toast.error('Unable to delete update.');
    }
  }

  return (
    <>
      <AdminPrayerSummaryCard prayerId={prayerId} />

      <AdminPrayerDetailPageView
        prayerId={prayerId}
        isAdmin={isAdmin}
        content={content}
        localStatus={localStatus}
        showDeleteConfirm={showDeleteConfirm}
        items={items}
        statusSelectId={statusSelectId}
        updateTextareaId={updateTextareaId}
        onBack={onBack}
        onPost={onPost}
        onSetStatus={onSetStatus}
        onClickDelete={onClickDelete}
        onConfirmDelete={onConfirmDelete}
        onCancelDelete={onCancelDelete}
        onChangeStatus={(next) => setLocalStatus(next)}
        onChangeContent={(next) => setContent(next)}
        onDeleteUpdate={onDeleteUpdate}
      />
    </>
  );
}
