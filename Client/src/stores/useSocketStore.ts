// Client/src/stores/socket.store.ts
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
  const s = getSocket();

  let queue: Patch[] = [];

  const flush = () => {
    if (!queue.length) return;
    const batch = queue;
    queue = [];

    const board = useBoardStore.getState();
    for (const item of batch) {
      if (item.type === 'upsert') board.upsertPrayer(item.p);
      if (item.type === 'move')   board.movePrayer(item.id, item.to);
    }
  };

  const debouncedFlush = debounce(flush, 200);

  s.on('connect',    () => set({ connected: true }));
  s.on('disconnect', () => set({ connected: false }));

  // Created
  s.on('prayer:created', (d: PrayerCreatedPayload) => {
    get().enqueue({ type: 'upsert', p: d.prayer });
    // Mirror into Praises store safely
    try { praisesOnSocketUpsert(d.prayer); } catch {}
  });

  // Updated
  s.on('prayer:updated', (d: PrayerUpdatedPayload) => {
    get().enqueue({ type: 'upsert', p: d.prayer });
    try { praisesOnSocketUpsert(d.prayer); } catch {}
  });

  // Moved (status or position change)
  s.on('prayer:moved', (d: PrayerMovedPayload) => {
    get().enqueue({ type: 'upsert', p: d.prayer }); // fields may have changed
    get().enqueue({ type: 'move', id: d.prayer.id, to: d.to });
    try { praisesOnSocketUpsert(d.prayer); } catch {}
  });

  // Deleted (optional; only if your backend emits this)
  s.on('prayer:deleted', (d: PrayerDeletedPayload) => {
    try { praisesOnSocketRemove(d.id); } catch {}
  });

  return {
    socket: s,
    connected: s.connected,
    joinGroup: (groupId: number)  => get().socket?.emit('join:group', groupId),
    leaveGroup: (groupId: number) => get().socket?.emit('leave:group', groupId),
    enqueue: (patch: Patch) => { queue.push(patch); debouncedFlush(); },
  };
});
