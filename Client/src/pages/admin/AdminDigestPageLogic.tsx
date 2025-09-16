import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  postDigestPreview,
  postDigestSendAuto,
  postDigestSendManual,
} from '../../helpers/api/adminApi';
import { useAuthStore } from '../../stores/useAuthStore';
import type { UpdateRow, SelectedMap } from '../../types/admin/adminDigest.types.ts';
import AdminDigestPageView from '../../jsx/admin/adminDigestPageView';

export default function AdminDigestPageLogic(): React.ReactElement {
  const auth = useAuthStore();

  // Single group only: derive once from user or fallback to 1
  const groupId = useMemo(() => {
    const val = auth.user?.groupId;
    return typeof val === 'number' && val > 0 ? val : 1;
  }, [auth.user?.groupId]);

  const [days, setDays] = useState<number>(7);
  const [updates, setUpdates] = useState<UpdateRow[]>([]);
  const [selected, setSelected] = useState<SelectedMap>({});
  const [subject, setSubject] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch preview whenever group or window changes
  useEffect(() => {
    void loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, days]);

  async function loadPreview() {
    setIsLoading(true);
    try {
      const res = await postDigestPreview({ groupId, days });
      if (res && typeof res === 'object' && 'ok' in res && (res).ok) {
        const rows = ((res).updates as unknown[]).map((u: any) => ({
          ...u,
          createdAt: new Date(u.createdAt).toISOString(),
        })) as UpdateRow[];
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
      if (res && typeof res === 'object' && 'ok' in res && (res).ok) {
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
      if (res && typeof res === 'object' && 'ok' in res && (res).ok) {
        toast.success('Digest sent (manual).');
      } else {
        toast.error('Failed to send digest.');
      }
    } catch {
      toast.error('Error sending digest.');
    }
  }

  function onToggleAll(next: boolean) {
    if (!updates.length) {
      setSelected({});
      return;
    }
    if (next) {
      const all: SelectedMap = {};
      for (const u of updates) all[u.id] = true;
      setSelected(all);
    } else {
      setSelected({});
    }
  }

  function onToggleRow(id: number, checked: boolean) {
    setSelected((s) => ({ ...s, [id]: checked }));
  }

  return (
    <AdminDigestPageView
      days={days}
      subject={subject}
      isLoading={isLoading}
      updates={updates}
      selected={selected}
      onChangeDays={setDays}
      onChangeSubject={setSubject}
      onToggleRow={onToggleRow}
      onToggleAll={onToggleAll}
      onSendAuto={onSendAuto}
      onSendManual={onSendManual}
    />
  );
}
