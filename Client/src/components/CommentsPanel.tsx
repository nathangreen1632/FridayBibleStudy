// Client/src/components/CommentsPanel.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCommentsStore } from '../stores/useCommentsStore';
import { useAuthStore } from '../stores/useAuthStore'; // ⬅️ NEW: read current user
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

    // NEW (passive capture listeners):
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
  return (
    <button
      type="button"
      onClick={props.toggle}
      className="w-full flex items-center justify-between px-3 py-2 rounded-xl border cursor-pointer"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)', color: 'var(--theme-text)' }}
    >
      <div className="flex items-center gap-2">
        <ChevronDown className={`transition-transform ${props.open ? 'rotate-180' : ''}`} />
        <span className="font-semibold">Comments</span>
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
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-textbox)', color: 'var(--theme-text)' }}
        placeholder={props.disabled ? 'Comments are closed by an admin' : 'Write a comment…'}
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
          className="px-3 py-1 rounded-lg text-base border border-[var(--theme-border)] bg-[var(--theme-button-dark)] text-[var(--theme-text)] hover:bg-[var(--theme-card)] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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

  const threads       = useCommentsStore((s) => s.threadsByPrayer.get(prayerId));
  const fetchRootPage = useCommentsStore((s) => s.fetchRootPage);
  const fetchReplies  = useCommentsStore((s) => s.fetchReplies);
  const create        = useCommentsStore((s) => s.create);
  const update        = useCommentsStore((s) => s.update);
  const remove        = useCommentsStore((s) => s.remove);
  const markSeen      = useCommentsStore((s) => s.markSeen);

  useEffect(() => {
    if (open) {
      if (!threads || threads.rootOrder.length === 0) { void fetchRootPage(prayerId, 10); }
      void markSeen(prayerId);
    }
  }, [open, threads, prayerId, fetchRootPage, markSeen]);

  const hasNew = useMemo(() => {
    if (!lastCommentAt || !lastSeenAt) return false;
    return new Date(lastCommentAt).getTime() > new Date(lastSeenAt).getTime();
  }, [lastCommentAt, lastSeenAt]);

  const [content, setContent] = useState('');

  const submitRoot = () => {
    if (!content.trim() || isClosed) return;
    void create(prayerId, content.trim(), {});
    setContent('');
  };

  return (
    <StopDragGroup label="Comments panel" className="mt-2 rounded-2xl shadow-sm">
      <HeaderRow
        open={open}
        toggle={() => setOpen((v) => !v)}
        count={counts}
        hasNew={hasNew}
        isClosed={isClosed}
      />

      {open && (
        <div className="bg-[var(--theme-accent)] px-3 pb-3 pt-2 space-y-3 rounded-2xl">
          <RootComposer
            disabled={isClosed}
            value={content}
            onChange={setContent}
            onSubmit={submitRoot}
          />

          <ThreadList
            prayerId={prayerId}
            fetchReplies={fetchReplies}
            update={update}
            remove={remove}
          />

          <RootPager prayerId={prayerId} />
        </div>
      )}
    </StopDragGroup>
  );
}

function ThreadList(props: Readonly<{
  prayerId: number;
  fetchReplies: (prayerId: number, rootId: number, limit?: number) => Promise<void>;
  update: (commentId: number, content: string) => Promise<void>;
  remove: (commentId: number) => Promise<void>;
}>) {
  const t = useCommentsStore((s) => s.threadsByPrayer.get(props.prayerId));
  if (!t) return null;

  return (
    <div className="space-y-4">
      {t.rootOrder.map((rootId) => (
        <Thread
          key={String(rootId)}
          prayerId={props.prayerId}
          rootId={rootId}
          fetchReplies={props.fetchReplies}
          update={props.update}
          remove={props.remove}
        />
      ))}
      {t.rootOrder.length === 0 && <div className="text-[var(--theme-text-white)] text-sm opacity-70">No comments yet.</div>}
    </div>
  );
}

function Thread(props: Readonly<{
  prayerId: number;
  rootId: number | string;
  fetchReplies: (prayerId: number, rootId: number, limit?: number) => Promise<void>;
  update: (commentId: number, content: string) => Promise<void>;
  remove: (commentId: number) => Promise<void>;
}>) {
  const t = useCommentsStore((s) => s.threadsByPrayer.get(props.prayerId));
  const root = t?.byId.get(props.rootId);
  const replies = (t?.repliesOrderByRoot.get(props.rootId) || [])
    .map((id) => t?.byId.get(id))
    .filter(Boolean) as Comment[];
  const page = t?.replyPageByRoot.get(props.rootId) || { hasMore: false, loading: false, error: null };

  const [replyText, setReplyText] = useState('');

  if (!t || !root) return null;

  return (
    <div className="rounded-xl border p-2" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}>
      <CommentItem comment={root} update={props.update} remove={props.remove} />
      <div className="pl-4 mt-2 space-y-2">
        {replies.map((r) => (
          <CommentItem key={r.id} comment={r} update={props.update} remove={props.remove} />
        ))}
        {page.hasMore && (
          <button
            type="button"
            className="text-sm underline cursor-pointer"
            onClick={() => { if (typeof props.rootId === 'number') { void props.fetchReplies(props.prayerId, props.rootId, 10); } }}
          >
            Show older replies…
          </button>
        )}

        <div className="space-y-2">
          <textarea
            className="w-full rounded-lg p-2 border text-sm placeholder:text-[var(--theme-placeholder)]/60"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-textbox)', color: 'var(--theme-text)' }}
            placeholder="Reply…"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            rows={2}
          />
          <div className="flex justify-end">
            <button
              type="button"
              className="px-3 py-1 rounded-lg text-sm cursor-pointer"
              style={{ background: 'var(--theme-button-blue)', color: 'var(--theme-text-white)' }}
              onClick={() => {
                if (!replyText.trim() || typeof props.rootId !== 'number') return;
                void useCommentsStore.getState().create(root.prayerId, replyText.trim(), { parentId: root.id });
                setReplyText('');
              }}
              disabled={!replyText.trim()}
            >
              Reply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentItem(props: Readonly<{
  comment: Comment;
  update: (id: number, content: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
}>) {
  const c = props.comment;
  const me = useAuthStore((s) => s.user); // ⬅️ who am I?
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState(c.content);

  // ⬇️ Friendly author display (never show raw temp id)
  const displayAuthor =
    c.authorName ??
    (c.authorId && me?.id === c.authorId ? 'You' : (c.authorId ? `User #${c.authorId}` : 'Someone'));

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

function RootPager(props: Readonly<{ prayerId: number }>) {
  const t = useCommentsStore((s) => s.threadsByPrayer.get(props.prayerId));
  const fetchRootPage = useCommentsStore((s) => s.fetchRootPage);
  if (!t) return null;
  if (t.rootPage.loading) return <div className="text-sm opacity-70">Loading comments…</div>;
  if (!t.rootPage.hasMore) return null;

  return (
    <div className="flex justify-center">
      <button
        type="button"
        className="px-3 py-1 rounded-lg text-sm cursor-pointer"
        style={{ background: 'var(--theme-button-gray)', color: 'var(--theme-text-white)' }}
        onClick={() => { void fetchRootPage(props.prayerId, 1); }}
      >
        Load more
      </button>
    </div>
  );
}
