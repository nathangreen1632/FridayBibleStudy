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

// ✅ Keep "My Prayers" (profile column) in sync too
import { myPrayersOnSocketUpsert, myPrayersOnSocketRemove } from './useMyPrayersStore.ts';

// ✅ Typed event constants + value type
import { Events } from '../types/socket.types';
import type { EventValue } from '../types/socket.types';

type PrayerDTO = Prayer;

// ---- PRAYER payloads ----
type PrayerCreatedPayload = { prayer: PrayerDTO };
type PrayerUpdatedPayload = { prayer: PrayerDTO };
type PrayerMovedPayload   = { prayer: PrayerDTO; from: Status; to: Status };
type PrayerDeletedPayload = { id: number };

// Legacy—server may not emit this anymore; safe to keep as a no-op listener.
type UpdateCreatedPayload = { id: number; prayerId: number };

// ---- COMMENT (updates) payloads — must match the server exactly ----
type CommentCreatedPayload = {
  prayerId: number;
  comment: Comment;
  newCount: number;
  lastCommentAt: string | null;
};

type CommentUpdatedPayload = {
  prayerId: number;
  comment: Comment;
};

type CommentDeletedPayload = {
  prayerId: number;
  commentId: number;
  newCount: number;
  lastCommentAt: string | null;
};

type CommentCountPayload = {
  prayerId: number;
  newCount: number;
  lastCommentAt: string | null;
};

type CommentsClosedPayload = {
  prayerId: number;
  isCommentsClosed: boolean;
};

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

  // --- replace your queue/flush section in useSocketStore.ts with this ---

  // Local in-memory queue for socket-driven patches
  let queue: Patch[] = [];

  // Drag-stall guards
  let dragDeferrals = 0;
  const MAX_DEFERRALS = 8;       // ~8 * 120ms ≈ 1s
  const MAX_DEFER_MS = 1500;     // hard stop after 1.5s
  let firstDeferAt: number | null = null;

  const flush = () => {
    if (!queue.length) return;

    let dragging: boolean;
    try {
      const { isDragging } = useBoardStore.getState();
      dragging = isDragging;
    } catch {
      dragging = false; // if store unavailable, don't block
    }

    if (dragging) {
      // initialize the defer timer once
      firstDeferAt ??= Date.now();

      const elapsed = Date.now() - firstDeferAt;
      const canKeepDeferring = dragDeferrals < MAX_DEFERRALS && elapsed < MAX_DEFER_MS;

      if (canKeepDeferring) {
        dragDeferrals += 1;
        setTimeout(() => {
          try { flush(); } catch {}
        }, 120);
        return;
      }

      // fall through after too many/too long deferrals
    }

    // reset drag guard on actual apply
    dragDeferrals = 0;
    firstDeferAt = null;

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
        // remove from the board immediately
        try { useBoardStore.getState().removePrayer(d.id); } catch {}
        // keep mirrored lists in sync
        try { praisesOnSocketRemove(d.id); } catch {}
        try { myPrayersOnSocketRemove(d.id); } catch {}
      });

      // Legacy "update created" → bump card visually; server also emits PrayerUpdated which will sync
      onE<UpdateCreatedPayload>(Events.UpdateCreated, (p) => {
        try { usePraisesStore.getState().bumpToTop(p.prayerId); } catch {}
        try { useBoardStore.getState().bumpToTop(p.prayerId); } catch {}
      });

      // ---- COMMENT (updates) events ----
      onE<CommentCreatedPayload>(Events.CommentCreated, (p) => {
        try { useCommentsStore.getState().onCreated(p); } catch {}
      });

      onE<CommentUpdatedPayload>(Events.CommentUpdated, (p) => {
        try { useCommentsStore.getState().onUpdated(p); } catch {}
      });

      // ✅ Robust delete handler: prefer store.onDeleted (updates counts + lastAt), else fallback
      onE<CommentDeletedPayload>(Events.CommentDeleted, (payload) => {
        try {
          const pid = Number((payload as any)?.prayerId || 0);
          const cid = Number((payload as any)?.commentId ?? (payload as any)?.id ?? 0);

          const cs = useCommentsStore.getState();

          if (typeof cs.onDeleted === 'function') {
            cs.onDeleted(payload as any);
            return;
          }

          if (pid && cid && typeof cs.removeComment === 'function') {
            cs.removeComment(pid, cid);
          }
        } catch {
          // swallow
        }
      });

      onE<CommentsClosedPayload>(Events.CommentsClosed, (p) => {
        try { useCommentsStore.getState().onClosedChanged(p); } catch {}
      });

      onE<CommentCountPayload>(Events.CommentCount, (p) => {
        // This updates newCount + lastCommentAt → drives the red bell state
        try { useCommentsStore.getState().onCountChanged(p); } catch {}
      });

      // ✅ Legacy back-compat: if anything still emits raw 'update:deleted'
      try {
        s.on('update:deleted', (payload: any) => {
          try {
            const pid = Number(payload?.prayerId || 0);
            const cid = Number(payload?.commentId || payload?.id || 0);
            if (!pid || !cid) return;

            const cs = useCommentsStore.getState();

            if (typeof cs.onDeleted === 'function') {
              cs.onDeleted({ prayerId: pid, commentId: cid });
              return;
            }

            if (typeof cs.removeComment === 'function') {
              cs.removeComment(pid, cid);
            }
          } catch {
            // swallow
          }
        });
      } catch {
        // no-op
      }

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
