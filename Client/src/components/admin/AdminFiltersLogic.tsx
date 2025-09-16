import React, { useEffect, useRef, useState } from 'react';
import { useAdminUiStore } from '../../stores/admin/useAdminUiStore';
import { useSocketStore } from '../../stores/useSocketStore';
import AdminFiltersView from '../../jsx/admin/adminFiltersView';
import type { AdminFiltersPatch, Category, Status } from '../../types/admin/admin.types.ts';
import { CATEGORY_OPTIONS, STATUS_OPTIONS, isCategory, isStatus } from '../../types/admin/admin.types.ts';

const FALLBACK_EVT = 'admin:filters:patch';

function emitFallback(patch: AdminFiltersPatch): void {
  try {
    window.dispatchEvent(new CustomEvent(FALLBACK_EVT, { detail: patch }));
  } catch {
    // noop — best-effort fallback
  }
}

export default function AdminFiltersLogic(): React.ReactElement {
  const ui = useAdminUiStore();
  const { socket, joinGroup, leaveGroup } = useSocketStore();

  // Join once per numeric groupId; safe default 1
  useEffect(() => {
    const gid = typeof ui.groupId === 'number' ? ui.groupId : 1;
    try { joinGroup(gid); } catch {}
    return () => { try { leaveGroup(gid); } catch {} };
  }, [ui.groupId]);

  // Re-join on socket reconnect (idempotent)
  useEffect(() => {
    if (!socket) return;
    const onConnect = () => {
      const gid = typeof ui.groupId === 'number' ? ui.groupId : 1;
      try { joinGroup(gid); } catch {}
    };
    try { socket.on('connect', onConnect); } catch {}
    return () => { try { socket.off?.('connect', onConnect); } catch {} };
  }, [socket, ui.groupId, joinGroup]);

  // ---- search box (debounced) ----
  const [qInput, setQInput] = useState(ui.q ?? '');
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setQInput(ui.q ?? '');
  }, [ui.q]);

  useEffect(() => {
    const next = qInput.trim();

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    debounceRef.current = window.setTimeout(() => {
      if (ui.q !== next) {
        const patch: AdminFiltersPatch = { q: next, page: 1 };
        ui.set(patch);
        try {
          if (socket?.emit) socket.emit('admin:filters:patch', patch);
          else emitFallback(patch);
        } catch {
          emitFallback(patch);
        }
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [qInput, ui]); // intentionally exclude socket to keep timer stable

  // ---- actions passed to view ----
  function clearSearch(): void {
    setQInput('');
    const patch: AdminFiltersPatch = { q: '', page: 1 };
    ui.set(patch);
    try {
      if (socket?.emit) socket.emit('admin:filters:patch', patch);
      else emitFallback(patch);
    } catch {
      emitFallback(patch);
    }
  }

  function changeCategory(raw: string): void {
    let next: Category | undefined;
    if (raw === '') next = undefined;
    else if (isCategory(raw)) next = raw;
    else next = undefined;

    const patch: AdminFiltersPatch = { category: next, page: 1 };
    ui.set(patch);
    try {
      if (socket?.emit) socket.emit('admin:filters:patch', patch);
      else emitFallback(patch);
    } catch {
      emitFallback(patch);
    }
  }

  function changeStatus(raw: string): void {
    let next: Status | undefined;
    if (raw === '') next = undefined;
    else if (isStatus(raw)) next = raw;
    else next = undefined;

    const patch: AdminFiltersPatch = { status: next, page: 1 };
    ui.set(patch);
    try {
      if (socket?.emit) socket.emit('admin:filters:patch', patch);
      else emitFallback(patch);
    } catch {
      emitFallback(patch);
    }
  }

  return (
    <AdminFiltersView
      qInput={qInput}
      setQInput={setQInput}
      clearSearch={clearSearch}
      categoryValue={ui.category ?? ''}
      statusValue={ui.status ?? ''}
      onCategoryChange={changeCategory}
      onStatusChange={changeStatus}
      CATEGORY_OPTIONS={CATEGORY_OPTIONS}
      STATUS_OPTIONS={STATUS_OPTIONS}
    />
  );
}
