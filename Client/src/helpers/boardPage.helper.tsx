import { useCallback, useEffect } from 'react';
import type { ColumnKey } from '../components/SortableCard';
import PrayerCardWithComments from '../components/PrayerCardWithComments';
import type { Prayer } from '../types/domain.types';
import { apiWithRecaptcha } from './secure-api.helper';
import { toast } from 'react-hot-toast';

/**
 * One-time bootstrap data fetch for a board page.
 * Safe: never throws; store handles its own error state.
 */
export function useBoardBootstrap(fetchInitial: () => Promise<void>) {
  useEffect(() => {
    (async () => {
      try {
        await fetchInitial();
      } catch {
        // store exposes error; swallow to keep UI responsive
      }
    })();
  }, [fetchInitial]);
}

/**
 * Join a socket group for real-time updates.
 * Safe: guards all socket ops; never throws.
 */
export function useJoinGroup(
  joinGroup: (groupId: number) => void,
  maybeGroupId?: number | null
) {
  useEffect(() => {
    try {
      if (maybeGroupId) {
        joinGroup(maybeGroupId);
      }
    } catch {
      // ignore; UI remains usable without socket
    }
  }, [joinGroup, maybeGroupId]);
}

/**
 * Server-persisted move to 'praise' status.
 * Safe: graceful failures; no throws.
 */
export function useMoveToPraise() {
  return useCallback(async (id: number) => {
    try {
      const r = await apiWithRecaptcha(`/api/prayers/${id}`, 'prayer_update', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'praise', position: 0 }),
      });

      if (!r.ok) {
        // Optional: toast on explicit failure; keeping quiet is fine since socket may reconcile.
        try {
          const body = await r.json().catch(() => ({}));
          const msg =
            (body && typeof body === 'object' && 'error' in body && typeof (body as any).error === 'string')
              ? (body as any).error
              : 'Failed to move to Praise';
          toast.error(msg);
        } catch {
          toast.error('Failed to move to Praise');
        }
      }
      // If ok: let socket/state reconcile; no toast needed
    } catch {
      // swallow per project guidance
    }
  }, []);
}

/**
 * Stable renderer for a PrayerCard *with comments*, given a byId map from the store.
 * Accepts an optional groupId so the Comments panel can join the right socket room.
 * Safe: returns null on any issue.
 */
export function usePrayerCardRenderer(byId: Map<number, Prayer>, groupId?: number | null) {
  return useCallback(
    (id: number, _column: ColumnKey, _index: number) => {
      try {
        const item = byId.get(id);
        if (!item) return null;

        return (
          <PrayerCardWithComments
            id={item.id}
            title={item.title}
            content={item.content}
            author={item.author?.name ?? null}
            category={item.category}
            createdAt={item.createdAt}
            groupId={groupId ?? null}
          />
        );
      } catch {
        return null;
      }
    },
    [byId, groupId]
  );
}

/**
 * Wrapper for store.move handler that surfaces a toast on failure.
 * Safe: no throws; returns void.
 */
export function useOnMove(
  move: (id: number, toStatus: 'active' | 'archived', newIndex: number) => Promise<boolean>
) {
  return useCallback(async (id: number, toStatus: 'active' | 'archived', newIndex: number) => {
    try {
      const ok = await move(id, toStatus, newIndex);
      if (!ok) {
        toast.error('Could not move prayer. Your changes were undone.');
      }
    } catch {
      // keep UI responsive; store will reconcile state
    }
  }, [move]);
}
