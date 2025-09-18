import { create } from 'zustand';
import type { Socket } from 'socket.io-client';
import { getSocket } from '../lib/socket.lib';
import { useBoardStore } from './useBoardStore.ts';
import { useCommentsStore } from './useCommentsStore.ts';
import type { Prayer, Status } from '../types/domain/domain.types.ts';
import type { Comment } from '../types/domain/comment.types.ts';
import { usePraisesStore, praisesOnSocketUpsert, praisesOnSocketRemove } from './usePraisesStore.ts';
import { myPrayersOnSocketUpsert, myPrayersOnSocketRemove } from './useMyPrayersStore.ts';
import { Events } from '../types/domain/socket.types.ts';
import type { EventValue } from '../types/domain/socket.types.ts';

type PrayerDTO = Prayer;
type PrayerCreatedPayload = { prayer: PrayerDTO };
type PrayerUpdatedPayload = { prayer: PrayerDTO };
type PrayerMovedPayload   = { prayer: PrayerDTO; from: Status; to: Status };
type PrayerDeletedPayload = { id: number };
type UpdateCreatedPayload = { id: number; prayerId: number };

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
  let s: Socket | undefined;
  try {
    s = getSocket();
  } catch {
    s = undefined;
  }

  let queue: Patch[] = [];

  let dragDeferrals = 0;
  const MAX_DEFERRALS = 8;
  const MAX_DEFER_MS = 1500;
  let firstDeferAt: number | null = null;

  const flush = () => {
    if (!queue.length) return;

    let dragging: boolean;
    try {
      const { isDragging } = useBoardStore.getState();
      dragging = isDragging;
    } catch {
      dragging = false;
    }

    if (dragging) {
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

    }

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

        }
      }
    } catch {

    }
  };

  const debouncedFlush = debounce(flush, 200);

  const hasOn = typeof s?.on === 'function';
  const hasEmit = typeof s?.emit === 'function';

  const onE = <P,>(event: EventValue, handler: (payload: P) => void) => {
    try {
      s?.on(event, handler as unknown as (...args: unknown[]) => void);
    } catch {

    }
  };

  function onPrayerUpdated(d: PrayerUpdatedPayload) {
    try { get().enqueue({ type: 'upsert', p: d.prayer }); } catch {}
    try { praisesOnSocketUpsert(d.prayer); } catch {}
    try { myPrayersOnSocketUpsert(d.prayer); } catch {}
  }

  if (hasOn && s) {
    try {
      s.on('connect',    () => set({ connected: true }));
      s.on('disconnect', () => set({ connected: false }));

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
        try { useBoardStore.getState().removePrayer(d.id); } catch {}
        try { praisesOnSocketRemove(d.id); } catch {}
        try { myPrayersOnSocketRemove(d.id); } catch {}
      });

      onE<UpdateCreatedPayload>(Events.UpdateCreated, (p) => {
        try { usePraisesStore.getState().bumpToTop(p.prayerId); } catch {}
        try { useBoardStore.getState().bumpToTop(p.prayerId); } catch {}
      });

      onE<CommentCreatedPayload>(Events.CommentCreated, (p) => {
        try { useCommentsStore.getState().onCreated(p); } catch {}
      });

      onE<CommentUpdatedPayload>(Events.CommentUpdated, (p) => {
        try { useCommentsStore.getState().onUpdated(p); } catch {}
      });

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

        }
      });

      onE<CommentsClosedPayload>(Events.CommentsClosed, (p) => {
        try { useCommentsStore.getState().onClosedChanged(p); } catch {}
      });

      onE<CommentCountPayload>(Events.CommentCount, (p) => {
        try { useCommentsStore.getState().onCountChanged(p); } catch {}
      });

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

          }
        });
      } catch {

      }

    } catch {

    }
  }

  return {
    socket: s,
    connected: !!s?.connected,

    joinGroup: (groupId: number) => {
      try {
        if (hasEmit) get().socket?.emit('join:group', groupId);

      } catch {

      }
    },

    leaveGroup: (groupId: number) => {
      try {
        if (hasEmit) get().socket?.emit('leave:group', groupId);

      } catch {

      }
    },

    enqueue: (patch: Patch) => {
      try {
        queue.push(patch);
        debouncedFlush();

      } catch {

      }
    },
  };
});
