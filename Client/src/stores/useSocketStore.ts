// Client/src/stores/useSocketStore.ts
import { create } from 'zustand';
import type { Socket } from 'socket.io-client';
import { getSocket } from '../lib/socket.lib';
import { useBoardStore } from './useBoardStore.ts';
import type { Prayer, Status } from '../types/domain.types';

// NEW: keep Praises in sync with socket events
import { praisesOnSocketUpsert, praisesOnSocketRemove } from './usePraisesStore.ts';

type PrayerDTO = Prayer;

type PrayerCreatedPayload = { prayer: PrayerDTO };
type PrayerUpdatedPayload = { prayer: PrayerDTO };
type PrayerMovedPayload   = { prayer: PrayerDTO; from: Status; to: Status };
// If your backend emits deletes, this will just work; otherwise it's harmless.
type PrayerDeletedPayload = { id: number };

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

  if (hasOn && s) {
    try {
      s.on('connect',    () => set({ connected: true }));
      s.on('disconnect', () => set({ connected: false }));

      // Created
      s.on('prayer:created', (d: PrayerCreatedPayload) => {
        try { get().enqueue({ type: 'upsert', p: d.prayer }); } catch {}
        try { praisesOnSocketUpsert(d.prayer); } catch {}
      });

      // Updated
      s.on('prayer:updated', (d: PrayerUpdatedPayload) => {
        try { get().enqueue({ type: 'upsert', p: d.prayer }); } catch {}
        try { praisesOnSocketUpsert(d.prayer); } catch {}
      });

      // Moved (status or position change)
      s.on('prayer:moved', (d: PrayerMovedPayload) => {
        try { get().enqueue({ type: 'upsert', p: d.prayer }); } catch {}
        try { get().enqueue({ type: 'move', id: d.prayer.id, to: d.to }); } catch {}
        try { praisesOnSocketUpsert(d.prayer); } catch {}
      });

      // Deleted (optional; only if your backend emits this)
      s.on('prayer:deleted', (d: PrayerDeletedPayload) => {
        try { praisesOnSocketRemove(d.id); } catch {}
      });
    } catch {
      // Listener wiring should never crash the app
    }
  }

  return {
    socket: s,
    connected: !!s?.connected,

    joinGroup: (groupId: number) => {
      // emit only if possible; ignore otherwise
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
        // (better to skip a single patch than crash UI)
      }
    },
  };
});
