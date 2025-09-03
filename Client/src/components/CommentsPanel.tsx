// Client/src/components/CommentsPanel.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCommentsStore } from '../stores/useCommentsStore';
import { useAuthStore } from '../stores/useAuthStore';
import type { Comment } from '../types/comment.types';
import { ChevronDown, BellDot, Lock } from 'lucide-react';

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
          className="px-3 py-1 rounded-lg text-base border border-[var(--theme-border)] bg-[var(--theme-button-dark)] text-[var(--theme-text)] hover:bg-[var(--theme-button-hover)] transition-colors cursor-pointer disabled:cursor-not-allowed"
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

  const counts        = useCommentsStore((s) => s.counts.get(prayerId) || 0);
  const lastCommentAt = useCommentsStore((s) => s.lastCommentAt.get(prayerId) || null);
  const lastSeenAt    = useCommentsStore((s) => s.unseen.get(prayerId) || null);
  const isClosed      = useCommentsStore((s) => s.closed.get(prayerId) || false);

  // IMPORTANT: do NOT default to [] here — keep undefined/null stable to avoid infinite effects
  const rootOrder = useCommentsStore((s) => s.threadsByPrayer.get(prayerId)?.rootOrder);
  const byId      = useCommentsStore((s) => s.threadsByPrayer.get(prayerId)?.byId);

  const fetchRootPage = useCommentsStore((s) => s.fetchRootPage);
  const create        = useCommentsStore((s) => s.create);
  const update        = useCommentsStore((s) => s.update);
  const remove        = useCommentsStore((s) => s.remove);
  const markSeen      = useCommentsStore((s) => s.markSeen);

  // Collapse-on-outside-click
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (ev: Event) => {
      const root = containerRef.current;
      const target = ev.target as Node | null;
      if (!root || !target) return;
      if (!root.contains(target)) setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [open]);

  // Fetch only when opening and list isn't loaded yet
  useEffect(() => {
    if (!open) return;
    const hasAny = Array.isArray(rootOrder) && rootOrder.length > 0;
    if (!hasAny) { void fetchRootPage(prayerId, 10); }
  }, [open, rootOrder, prayerId, fetchRootPage]);

  // Mark seen ONLY on transition from closed -> open (prevents instant clearing after new posts)
  const prevOpenRef = useRef<boolean>(open);
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    if (!wasOpen && open) {
      void markSeen(prayerId);
    }
    prevOpenRef.current = open;
  }, [open, markSeen, prayerId]);

  // compute hasNew without nested ternaries
  let hasNew = false;
  if (lastCommentAt && lastSeenAt) {
    hasNew = new Date(lastCommentAt).getTime() > new Date(lastSeenAt).getTime();
  }

  const [content, setContent] = useState('');

  const submitRoot = () => {
    const trimmed = content.trim();
    if (!trimmed || isClosed) return;
    // Optimistic insert via store; socket will reconcile id
    void create(prayerId, trimmed, {});
    setContent('');
  };

  // Strict DESC by createdAt (newest first)
  const itemsDesc = useMemo(() => {
    const ids = Array.isArray(rootOrder) ? rootOrder : [];
    const list = ids
      .map((id) => byId?.get(id))
      .filter(Boolean) as Comment[];
    list.sort((a, b) => {
      const ta = Date.parse(a.createdAt || '');
      const tb = Date.parse(b.createdAt || '');
      if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
      return tb - ta; // DESC
    });
    return list;
  }, [rootOrder, byId]);

  return (
    <div ref={containerRef}>
      <StopDragGroup label="Updates panel" className="mt-2 rounded-2xl shadow-sm">
        <HeaderRow
          open={open}
          toggle={() => setOpen((v) => !v)}
          count={counts}
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
              onClick={() => { setEdit(false); if (text.trim()) { void props.update(c.id, text.trim()); } }}
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
          <button className="text-xs underline cursor-pointer" onClick={() => { void props.remove(c.id); }}>Delete</button>
        </div>
      )}
    </div>
  );
}
