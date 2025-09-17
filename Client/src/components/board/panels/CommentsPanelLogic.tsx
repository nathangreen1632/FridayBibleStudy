import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCommentsStore } from '../../../stores/useCommentsStore.ts';
import { useAuthStore } from '../../../stores/useAuthStore.ts';
import type { Comment } from '../../../types/domain/comment.types.ts';
import {
  safeParseTime,
  newestLocalFrom,
  computeDisplayCount,
  hasNewFlag,
  sortRootItemsDesc,
} from '../../../helpers/commentsPanel.helper.ts';
import { useOutsideCollapse } from '../../../hooks/useOutsideCollapse.ts';
import CommentsPanelView from '../../../jsx/board/commentsPanelView.tsx';

type Props = Readonly<{
  prayerId: number;
  groupId?: number | null;
  initiallyOpen?: boolean;
}>;

export default function CommentsPanelLogic(props: Props): React.ReactElement {
  const { prayerId } = props;
  const [open, setOpen] = useState<boolean>(!!props.initiallyOpen);

  const countFromStore = useCommentsStore((s) => s.counts.get(prayerId));
  const lastCommentAt = useCommentsStore((s) => s.lastCommentAt.get(prayerId) || null);
  const lastSeenAt = useCommentsStore((s) => s.unseen.get(prayerId) || null);
  const isClosed = useCommentsStore((s) => s.closed.get(prayerId) || false);

  const rootOrder = useCommentsStore((s) => s.threadsByPrayer.get(prayerId)?.rootOrder);
  const byId = useCommentsStore((s) => s.threadsByPrayer.get(prayerId)?.byId);

  const fetchRootPage = useCommentsStore((s) => s.fetchRootPage);
  const refreshRoot = useCommentsStore((s) => s.refreshRoot);
  const create = useCommentsStore((s) => s.create);
  const update = useCommentsStore((s) => s.update);
  const remove = useCommentsStore((s) => s.remove);
  const markSeen = useCommentsStore((s) => s.markSeen);

  const meId = useAuthStore((s) => s.user?.id ?? null);

  useEffect(() => {
    const hasCounts = useCommentsStore.getState().counts.has(prayerId);
    if (!hasCounts) {
      (async () => {
        try { await fetchRootPage(prayerId, 1);

        } catch {

        }
      })();
    }
  }, [prayerId, fetchRootPage]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  useOutsideCollapse(containerRef, open, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    (async () => {
      try { await fetchRootPage(prayerId, 10);

      } catch {

      }
    })();
  }, [open, prayerId, fetchRootPage]);

  const newestLocal = useMemo(() => newestLocalFrom(rootOrder, byId), [rootOrder, byId]);
  const newestServer = useMemo(() => safeParseTime(lastCommentAt), [lastCommentAt]);

  useEffect(() => {
    if (!open) return;
    if (newestServer <= newestLocal) return;

    try { refreshRoot(prayerId);

    } catch {

    }
    (async () => {
      try { await fetchRootPage(prayerId, 10);

      } catch {

      }
    })();
  }, [open, prayerId, newestServer, newestLocal, refreshRoot, fetchRootPage]);

  const prevOpenRef = useRef<boolean>(open);
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    if (!wasOpen && open) {
      (async () => {
        try { await markSeen(prayerId);

        } catch {

        }
      })();
    }
    prevOpenRef.current = open;
  }, [open, markSeen, prayerId]);

  const hasNew: boolean = hasNewFlag(lastCommentAt, lastSeenAt);

  const [content, setContent] = useState('');

  async function submitRoot(): Promise<void> {
    const trimmed = content.trim();
    if (!trimmed || isClosed) return;
    try { await create(prayerId, trimmed, {});

    } catch {

    }
    setContent('');
  }

  const itemsDesc: Comment[] = useMemo(
    () => sortRootItemsDesc(byId, rootOrder),
    [byId, rootOrder]
  );

  const displayCount = computeDisplayCount(countFromStore, rootOrder);

  return (
    <CommentsPanelView
      containerRef={containerRef}
      open={open}
      setOpen={setOpen}
      isClosed={isClosed}
      hasNew={hasNew}
      displayCount={displayCount}
      items={itemsDesc}
      meId={meId}
      content={content}
      setContent={setContent}
      onSubmit={submitRoot}
      onUpdate={update}
      onRemove={remove}
    />
  );
}
