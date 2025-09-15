// Client/src/helpers/boardPage.helper.tsx
import React, { useCallback, useEffect } from 'react';
import type { ColumnKey } from '../components/SortableCard';
import PrayerCardWithComments from '../components/PrayerCardWithComments';
import type { Prayer, Status } from '../types/domain.types';
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
 * Server-persisted move to any status ('active' | 'praise' | 'archived').
 * Uses your existing Enterprise reCAPTCHA flow.
 * Safe: graceful failures; no throws.
 */
export function useMoveToStatus() {
  return useCallback(async (id: number, to: Status) => {
    try {
      const res = await apiWithRecaptcha(
        `/api/prayers/${id}`,
        'prayer_update',
        {
          method: 'PATCH',
          body: JSON.stringify({ status: to, position: 0 }),
        }
      );

      if (!res.ok) {
        try {
          const body = await res.json().catch(() => ({}));
          const msg =
            body && typeof body === 'object' && 'error' in body && typeof (body).error === 'string'
              ? (body).error
              : 'Failed to update status';
          toast.error(msg);
        } catch {
          toast.error('Failed to update status');
        }
      }
      // success: let socket/state reconcile
    } catch {
      // swallow per project guidance
    }
  }, []);
}

/**
 * Back-compat shim for old callers that only moved to 'praise'.
 * Prefer useMoveToStatus().
 */
export function useMoveToPraise() {
  const moveToStatus = useMoveToStatus();
  return useCallback(async (id: number) => {
    await moveToStatus(id, 'praise');
  }, [moveToStatus]);
}

/**
 * Stable renderer for a PrayerCard *with comments*, given a byId map from the store.
 * Accepts an optional groupId so the Comments panel can join the right socket room.
 * Passes onMove for the mobile “Move To →” bar.
 * Safe: returns null on any issue.
 */
export function usePrayerCardRenderer(byId: Map<number, Prayer>, groupId?: number | null) {
  const moveToStatus = useMoveToStatus();

  return useCallback(
    (id: number, _column: ColumnKey, _index: number) => {
      try {
        const item = byId.get(id);
        if (!item) return null;

        return React.createElement(PrayerCardWithComments, {
          id: item.id,
          title: item.title,
          content: item.content,
          author: item.author?.name ?? null,
          category: item.category,
          createdAt: item.createdAt,
          groupId: groupId ?? null,
          onMove: (prayerId: number, to: Status) => { void moveToStatus(prayerId, to); },
        });
      } catch {
        return null;
      }
    },
    [byId, groupId, moveToStatus]
  );
}

/**
 * Wrapper for store.move handler that surfaces a toast on failure (drag & drop).
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
