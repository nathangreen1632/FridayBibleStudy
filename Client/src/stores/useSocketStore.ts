// Client/src/stores/useSocketStore.ts
import { create } from 'zustand';
import type { Socket } from 'socket.io-client';
import { getSocket } from '../lib/socket.lib';
import { useBoardStore } from './useBoardStore.ts';
import { useCommentsStore } from './useCommentsStore.ts';
import type { Prayer, Status } from '../types/domain.types';
import type { Comment } from '../types/comment.types';

// Keep Praises in sync with socket events
import { usePraisesStore, praisesOnSocketUpsert, praisesOnSocketRemove } from './usePraisesStore.ts';

// ✅ NEW: keep "My Prayers" (profile column) in sync too
import { myPrayersOnSocketUpsert, myPrayersOnSocketRemove } from './useMyPrayersStore.ts';

// ✅ Typed event constants + value type
import { Events } from '../types/socket.types';
import type { EventValue } from '../types/socket.types';

type PrayerDTO = Prayer;

type PrayerCreatedPayload = { prayer: PrayerDTO };
type PrayerUpdatedPayload = { prayer: PrayerDTO };
type PrayerMovedPayload   = { prayer: PrayerDTO; from: Status; to: Status };
type PrayerDeletedPayload = { id: number };
type UpdateCreatedPayload = { id: number; prayerId: number };

type Patch =
  | { type: 'upsert'; p: Prayer }
  | { type: 'move'; id: number; to: Status };

function debounce<F extends (...args: any[]) => void>(fn: F, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<F>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

interface SocketState {
  socket?: Socket;
  connected: boolean;
  joinGroup: (groupId: number) => void;
  leaveGroup: (groupId: number) => void;
  enqueue: (patch: Patch) => void;
}

export const useSocketStore = create<SocketState>((set, get) => {
  // Safe socket acquisition with graceful fallback
  let s: Socket | undefined;
  try {
    s = getSocket();
  } catch {
    s = undefined; // rely on guards below; app keeps running without realtime
  }

  // Local in-memory queue for socket-driven patches
  let queue: Patch[] = [];

  const flush = () => {
    if (!queue.length) return;

    // Don't mutate board order mid-drag; retry shortly
    try {
      const { isDragging } = useBoardStore.getState();
      if (isDragging) {
        setTimeout(() => {
          try { flush(); } catch {}
        }, 120);
        return;
      }
    } catch {
      // if store is unavailable, fall through and try to apply (don’t crash)
    }

    const batch = queue;
    queue = [];

    try {
      const board = useBoardStore.getState();
      for (const item of batch) {
        try {
          if (item.type === 'upsert') board.upsertPrayer(item.p);
          if (item.type === 'move')   board.movePrayer(item.id, item.to);
        } catch {
          // ignore per-item errors to keep the rest of the batch flowing
        }
      }
    } catch {
      // if the board store is unavailable or errors, swallow to avoid breaking the socket loop
    }
  };

  const debouncedFlush = debounce(flush, 200);

  // Safely attach listeners if available
  const hasOn = typeof s?.on === 'function';
  const hasEmit = typeof s?.emit === 'function';

  // 🔒 Typed wrapper: only allows valid EventValue names
  const onE = <P,>(event: EventValue, handler: (payload: P) => void) => {
    try {
      // cast only the handler, event is strictly typed by EventValue
      s?.on(event, handler as unknown as (...args: unknown[]) => void);
    } catch {
      // never crash wiring
    }
  };

  // Unified handler that typed events will use
  function onPrayerUpdated(d: PrayerUpdatedPayload) {
    try { get().enqueue({ type: 'upsert', p: d.prayer }); } catch {}
    try { praisesOnSocketUpsert(d.prayer); } catch {}
    try { myPrayersOnSocketUpsert(d.prayer); } catch {}
    // NOTE: no explicit rebuildColumn call needed; upsertPrayer re-sorts by `position`.
  }

  if (hasOn && s) {
    try {
      // Socket.IO internal events (not part of our typed domain list)
      s.on('connect',    () => set({ connected: true }));
      s.on('disconnect', () => set({ connected: false }));

      // ---- PRAYER events ----
      onE<PrayerCreatedPayload>(Events.PrayerCreated, (d) => {
        try { get().enqueue({ type: 'upsert', p: d.prayer }); } catch {}
        try { praisesOnSocketUpsert(d.prayer); } catch {}
        try { myPrayersOnSocketUpsert(d.prayer); } catch {}
      });

      onE<PrayerUpdatedPayload>(Events.PrayerUpdated, onPrayerUpdated);

      onE<PrayerMovedPayload>(Events.PrayerMoved, (d) => {
        try { get().enqueue({ type: 'upsert', p: d.prayer }); } catch {}
        try { get().enqueue({ type: 'move', id: d.prayer.id, to: d.to }); } catch {}
        try { praisesOnSocketUpsert(d.prayer); } catch {}
        try { myPrayersOnSocketUpsert(d.prayer); } catch {}
      });

      onE<PrayerDeletedPayload>(Events.PrayerDeleted, (d) => {
        // ✅ NEW: remove from the board immediately
        try { useBoardStore.getState().removePrayer(d.id); } catch {}

        // existing behaviors (keep them)
        try { praisesOnSocketRemove(d.id); } catch {}
        try { myPrayersOnSocketRemove(d.id); } catch {}
      });

      // When an update is added to a prayer, bump it visually right away.
      // Server also emits PrayerUpdated which will sync position soon after.
      onE<UpdateCreatedPayload>(Events.UpdateCreated, (p) => {
        try { useBoardStore.getState().bumpToTop(p.prayerId); } catch {}
        try { usePraisesStore.getState().bumpToTop(p.prayerId); } catch {}
        // Profile column will re-sort on the subsequent PrayerUpdated event.
      });

      // ---- COMMENT events ----
      onE<{ prayerId: number; comment: Comment; newCount: number; lastCommentAt: string | null }>(
        Events.CommentCreated,
        (p) => { try { useCommentsStore.getState().onCreated(p); } catch {} }
      );

      onE<{ prayerId: number; comment: Comment }>(
        Events.CommentUpdated,
        (p) => { try { useCommentsStore.getState().onUpdated(p); } catch {} }
      );

      onE<{ prayerId: number; commentId: number; newCount: number; lastCommentAt: string | null }>(
        Events.CommentDeleted,
        (p) => { try { useCommentsStore.getState().onDeleted(p); } catch {} }
      );

      onE<{ prayerId: number; isCommentsClosed: boolean }>(
        Events.CommentsClosed,
        (p) => { try { useCommentsStore.getState().onClosedChanged(p); } catch {} }
      );

      onE<{ prayerId: number; newCount: number; lastCommentAt: string | null }>(
        Events.CommentCount,
        (p) => { try { useCommentsStore.getState().onCountChanged(p); } catch {} }
      );

    } catch {
      // Listener wiring should never crash the app
    }
  }

  return {
    socket: s,
    connected: !!s?.connected,

    joinGroup: (groupId: number) => {
      try {
        if (hasEmit) get().socket?.emit('join:group', groupId);
      } catch {
        // ignore
      }
    },

    leaveGroup: (groupId: number) => {
      try {
        if (hasEmit) get().socket?.emit('leave:group', groupId);
      } catch {
        // ignore
      }
    },

    enqueue: (patch: Patch) => {
      try {
        queue.push(patch);
        debouncedFlush();
      } catch {
        // if queueing fails for any reason, drop gracefully
      }
    },
  };
});
