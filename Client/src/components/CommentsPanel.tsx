// Client/src/components/CommentsPanel.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCommentsStore } from '../stores/useCommentsStore';
import { useAuthStore } from '../stores/useAuthStore';
import type { Comment } from '../types/comment.types';
import { ChevronDown, BellDot, Lock } from 'lucide-react';
import {
  safeParseTime,
  newestLocalFrom,
  computeDisplayCount,
  hasNewFlag,         // helper
  sortRootItemsDesc, // helper
} from '../helpers/commentsPanel.helper';
import { useOutsideCollapse } from '../hooks/useOutsideCollapse';
import {pressBtn} from "../../ui/press.ts";

/** Capture pointer/mouse on a wrapper element to block DnD start without adding onMouseDown props. */
function StopDragGroup(props: Readonly<{
  label: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}>) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = (e: Event) => e.stopPropagation();

    const opts = { capture: true, passive: true } as AddEventListenerOptions;
    el.addEventListener('pointerdown', stop, opts);
    el.addEventListener('mousedown', stop, opts);
    el.addEventListener('touchstart', stop, opts);
    return () => {
      el.removeEventListener('pointerdown', stop, opts);
      el.removeEventListener('mousedown', stop, opts);
      el.removeEventListener('touchstart', stop, opts);
    };
  }, []);

  return (
    <section ref={ref as any} role="text" aria-label={props.label} className={props.className} style={props.style}>
      {props.children}
    </section>
  );
}

function HeaderRow(props: Readonly<{
  open: boolean;
  toggle: () => void;
  count: number;
  hasNew: boolean;
  isClosed: boolean;
}>): React.ReactElement {
  const chevronClass = props.open ? 'rotate-180' : '';
  return (
    <button
      type="button"
      onClick={props.toggle}
      className="w-full flex items-center justify-between px-3 py-2 rounded-xl border cursor-pointer"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)', color: 'var(--theme-text)' }}
    >
      <div className="flex items-center gap-2">
        <ChevronDown className={`transition-transform ${chevronClass}`} />
        <span className="font-semibold">Updates</span>
        <span className="text-xs opacity-80">({props.count})</span>
        {props.hasNew && <BellDot className="w-4 h-4" color="#ef4444" />}
        {props.isClosed && <Lock className="w-4 h-4 opacity-80" />}
      </div>
    </button>
  );
}

function RootComposer(props: Readonly<{
  disabled: boolean;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}>): React.ReactElement {
  const localRef = useRef<HTMLTextAreaElement | null>(null);
  return (
    <div className="space-y-2">
      <textarea
        ref={localRef}
        className="w-full rounded-lg p-2 border text-sm placeholder-[var(--theme-placeholder)]/60"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-textbox)', color: 'var(--theme-placeholder)' }}
        placeholder={props.disabled ? 'Updates are closed by an admin' : 'Write an update…'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
        onFocus={(e) => e.stopPropagation()}
        disabled={props.disabled}
        rows={3}
      />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={props.onSubmit}
          disabled={!props.value.trim() || props.disabled}
          className={pressBtn("px-3 py-1 rounded-lg text-base border border-[var(--theme-border)] bg-[var(--theme-button-dark)] text-[var(--theme-text)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] transition-colors cursor-pointer disabled:cursor-not-allowed")}
        >
          Post
        </button>
      </div>
    </div>
  );
}

export default function CommentsPanel(props: Readonly<{
  prayerId: number;
  groupId?: number | null;
  initiallyOpen?: boolean;
}>) {
  const { prayerId } = props;
  const [open, setOpen] = useState(!!props.initiallyOpen);

  // CHANGED: don’t default to 0; we’ll compute displayCount below
  const countFromStore = useCommentsStore((s) => s.counts.get(prayerId));
  const lastCommentAt  = useCommentsStore((s) => s.lastCommentAt.get(prayerId) || null);
  const lastSeenAt     = useCommentsStore((s) => s.unseen.get(prayerId) || null);
  const isClosed       = useCommentsStore((s) => s.closed.get(prayerId) || false);

  // IMPORTANT: do NOT default to [] here — keep undefined/null stable to avoid infinite effects
  const rootOrder = useCommentsStore((s) => s.threadsByPrayer.get(prayerId)?.rootOrder);
  const byId      = useCommentsStore((s) => s.threadsByPrayer.get(prayerId)?.byId);

  const fetchRootPage = useCommentsStore((s) => s.fetchRootPage);
  const refreshRoot   = useCommentsStore((s) => s.refreshRoot);
  const create        = useCommentsStore((s) => s.create);
  const update        = useCommentsStore((s) => s.update);
  const remove        = useCommentsStore((s) => s.remove);
  const markSeen      = useCommentsStore((s) => s.markSeen);

  // Hydrate header counts/flags even when collapsed (first mount or prayer change)
  useEffect(() => {
    const hasCounts = useCommentsStore.getState().counts.has(prayerId);
    if (!hasCounts) {
      (async () => {
        try {
          await fetchRootPage(prayerId, 1); // lightweight fetch: fills counts/lastCommentAt/closed
        } catch {
          // ignore
        }
      })();
    }
  }, [prayerId, fetchRootPage]);


  // Collapse-on-outside-click (via hook)
  const containerRef = useRef<HTMLDivElement | null>(null);
  useOutsideCollapse(containerRef, open, () => setOpen(false));

  // Fetch only when opening and list isn't loaded yet
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        await fetchRootPage(prayerId, 10);
      } catch {
        // ignore
      }
    })();
  }, [open, prayerId, fetchRootPage]);

  /* ------------------------------------------------------------------------
   * LOW-CC refresh gate: compute, then act
   * ----------------------------------------------------------------------*/
  const newestLocal = useMemo(
    () => newestLocalFrom(rootOrder, byId),
    [rootOrder, byId]
  );

  const newestServer = useMemo(
    () => safeParseTime(lastCommentAt),
    [lastCommentAt]
  );

  // If server has newer content than our newest local root, refresh first page
  useEffect(() => {
    if (!open) return;
    if (newestServer <= newestLocal) return;

    try { refreshRoot(prayerId); } catch {}

    (async () => {
      try {
        // Works with your updated signature: (prayerId, 10) OR (prayerId, { limit: 10, reset: true })
        await fetchRootPage(prayerId, 10);
      } catch {
        // ignore
      }
    })();
  }, [open, prayerId, newestServer, newestLocal, refreshRoot, fetchRootPage]);

  // Mark seen ONLY on transition from closed -> open (prevents instant clearing after new posts)
  const prevOpenRef = useRef<boolean>(open);
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    if (!wasOpen && open) {
      (async () => {
        try {
          await markSeen(prayerId);
        } catch {
          // ignore
        }
      })();
    }
    prevOpenRef.current = open;
  }, [open, markSeen, prayerId]);

  // compute hasNew without nested ternaries (via helper)
  const hasNew: boolean = hasNewFlag(lastCommentAt, lastSeenAt);

  const [content, setContent] = useState('');

  const submitRoot = async () => {
    const trimmed = content.trim();
    if (!trimmed || isClosed) return;
    try {
      // Optimistic insert via store; socket will reconcile id
      await create(prayerId, trimmed, {});
    } catch {
      // ignore
    } finally {
      setContent('');
    }
  };

  // Strict DESC by createdAt (newest first) and hide deleted (via helper)
  const itemsDesc: Comment[] = useMemo(() => {
    return sortRootItemsDesc(byId, rootOrder);
  }, [byId, rootOrder]);

  const displayCount = computeDisplayCount(countFromStore, rootOrder);

  return (
    <div ref={containerRef}>
      <StopDragGroup label="Updates panel" className="mt-2 rounded-2xl shadow-sm">
        <HeaderRow
          open={open}
          toggle={() => setOpen((v) => !v)}
          count={displayCount}
          hasNew={hasNew}
          isClosed={isClosed}
        />

        {open && (
          <div className="bg-[var(--theme-accent)] px-3 pb-3 pt-2 space-y-3 rounded-2xl">
            {/* Root-only list (no replies) — strict DESC by createdAt */}
            <div className="space-y-4">
              {itemsDesc.map((c) => (
                <div
                  key={String(c.id)}
                  className="rounded-xl border p-2"
                  style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
                >
                  <CommentItem comment={c} update={update} remove={remove} />
                </div>
              ))}
              {itemsDesc.length === 0 && (
                <div className="text-[var(--theme-text-white)] text-sm opacity-70">No updates yet.</div>
              )}
            </div>

            {/* Composer at the bottom */}
            <RootComposer
              disabled={isClosed}
              value={content}
              onChange={setContent}
              onSubmit={submitRoot}
            />
          </div>
        )}
      </StopDragGroup>
    </div>
  );
}

function CommentItem(props: Readonly<{
  comment: Comment;
  update: (id: number, content: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
}>) {
  const c = props.comment;
  const me = useAuthStore((s) => s.user);
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState(c.content);

  // No nested ternaries
  let displayAuthor = 'Someone';
  if (c.authorName) {
    displayAuthor = c.authorName;
  } else if (c.authorId && me?.id === c.authorId) {
    displayAuthor = 'You';
  } else if (c.authorId) {
    displayAuthor = `User #${c.authorId}`;
  }

  const displayTime = c.id < 0 ? 'sending…' : new Date(c.createdAt).toLocaleString();

  return (
    <div className="rounded-lg p-2" style={{ background: 'var(--theme-accent)' }}>
      <div className="text-[var(--theme-text-white)] text-xs opacity-70 flex justify-between">
        <span>{displayAuthor} · {displayTime}</span>
        {c.deletedAt && <span className="text-[var(--theme-error)]">deleted</span>}
      </div>
      {!edit && <div className="text-[var(--theme-text-white)] text-sm whitespace-pre-wrap mt-1">{c.content}</div>}
      {edit && (
        <>
          <textarea
            className="w-full rounded-lg p-2 border text-sm mt-1"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)', color: 'var(--theme-text)' }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            onPointerDown={(e) => e.stopPropagation()}
          />
          <div className="flex gap-2 justify-end mt-2">
            <button
              className="px-3 py-1 rounded-lg text-sm cursor-pointer"
              style={{ background: 'var(--theme-button-blue)', color: 'var(--theme-text-white)' }}
              onClick={async () => {
                setEdit(false);
                if (text.trim()) {
                  try { await props.update(c.id, text.trim()); } catch { /* ignore */ }
                }
              }}

            >
              Save
            </button>
            <button
              className="px-3 py-1 rounded-lg text-sm cursor-pointer"
              style={{ background: 'var(--theme-button-gray)', color: 'var(--theme-text-white)' }}
              onClick={() => setEdit(false)}
            >
              Cancel
            </button>
          </div>
        </>
      )}
      {!edit && (
        <div className="text-[var(--theme-text-white)] flex gap-3 mt-2">
          <button className="text-xs underline cursor-pointer" onClick={() => setEdit(true)}>Edit</button>
          <button className="text-xs underline cursor-pointer" onClick={async () => {
            try { await props.remove(c.id); } catch { /* ignore */ }
          }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
