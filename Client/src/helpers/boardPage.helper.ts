import React, { useCallback, useEffect } from 'react';
import type { ColumnKey } from '../components/board/dnd/SortableCard.tsx';
import PrayerCardWithComments from '../components/board/cards/PrayerCardWithCommentsLogic.tsx';
import type { Prayer, Status } from '../types/domain/domain.types.ts';
import { apiWithRecaptcha } from './secure-api.helper';
import { toast } from 'react-hot-toast';

function fireAndForgetAsync<T>(fn: () => Promise<T>): void {
  const schedule: (cb: () => void) => void =
    typeof queueMicrotask === 'function' ? queueMicrotask : (cb) => setTimeout(cb, 0);

  schedule(() => {
    (async () => {
      try {
        await fn();
      } catch {
        console.error('Error in fireAndForgetAsync');
      }
    })();
  });
}

export function useBoardBootstrap(fetchInitial: () => Promise<void>) {
  useEffect(() => {
    (async () => {
      try {
        await fetchInitial();
      } catch {

      }
    })();
  }, [fetchInitial]);
}

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

    }
  }, [joinGroup, maybeGroupId]);
}

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
              : 'You may not move another\'s prayer.';
          toast.error(msg);
        } catch {
          toast.error('You may not move another\'s prayer.');
        }
      }

    } catch {

    }
  }, []);
}

export function useMoveToPraise() {
  const moveToStatus = useMoveToStatus();
  return useCallback(async (id: number) => {
    await moveToStatus(id, 'praise');
  }, [moveToStatus]);
}

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
          onMove: (prayerId: number, to: Status): void => {
            fireAndForgetAsync(() => moveToStatus(prayerId, to));
          },
        });
      } catch {
        return null;
      }
    },
    [byId, groupId, moveToStatus]
  );
}

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

    }
  }, [move]);
}
