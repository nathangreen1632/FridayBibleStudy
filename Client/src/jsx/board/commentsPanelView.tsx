import React, { useEffect, useRef } from 'react';
import { ChevronDown, BellDot, Lock } from 'lucide-react';
import type { Comment } from '../../types/domain/comment.types.ts';
import { pressBtn } from '../../../ui/press.ts';

type Props = Readonly<{
  containerRef: React.RefObject<HTMLDivElement | null>;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isClosed: boolean;
  hasNew: boolean;
  displayCount: number;

  items: Comment[];
  meId: number | null;

  content: string;
  setContent: (v: string) => void;
  onSubmit: () => void | Promise<void>;

  onUpdate: (id: number, content: string) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
}>;

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
        {props.hasNew ? <BellDot className="w-4 h-4" color="#ef4444" /> : null}
        {props.isClosed ? <Lock className="w-4 h-4 opacity-80" /> : null}
      </div>
    </button>
  );
}

function RootComposer(props: Readonly<{
  disabled: boolean;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void | Promise<void>;
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
        onChange={(e) => props.onChange(e.currentTarget.value)}
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

function CommentItem(props: Readonly<{
  comment: Comment;
  meId: number | null;
  update: (id: number, content: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
}>): React.ReactElement {
  const c = props.comment;
  const [edit, setEdit] = React.useState(false);
  const [text, setText] = React.useState(c.content);

  // No nested ternaries
  let displayAuthor = 'Someone';
  if (c.authorName) {
    displayAuthor = c.authorName;
  } else if (c.authorId && props.meId != null && props.meId === c.authorId) {
    displayAuthor = 'You';
  } else if (c.authorId) {
    displayAuthor = `User #${c.authorId}`;
  }

  const displayTime = c.id < 0 ? 'sending…' : new Date(c.createdAt).toLocaleString();

  return (
    <div className="rounded-lg p-2" style={{ background: 'var(--theme-accent)' }}>
      <div className="text-[var(--theme-text-white)] text-xs opacity-70 flex justify-between">
        <span>{displayAuthor} · {displayTime}</span>
        {c.deletedAt ? <span className="text-[var(--theme-error)]">deleted</span> : null}
      </div>

      {!edit ? (
        <div className="text-[var(--theme-text-white)] text-sm whitespace-pre-wrap mt-1">{c.content}</div>
      ) : (
        <>
          <textarea
            className="w-full rounded-lg p-2 border text-sm mt-1"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-textbox)', color: 'var(--theme-placeholder)' }}
            value={text}
            onChange={(e) => setText(e.currentTarget.value)}
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

      {!edit ? (
        <div className="text-[var(--theme-text-white)] flex gap-3 mt-2">
          <button className="text-xs underline cursor-pointer" onClick={() => setEdit(true)}>Edit</button>
          <button
            className="text-xs underline cursor-pointer"
            onClick={async () => {
              try { await props.remove(c.id); } catch { /* ignore */ }
            }}
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function CommentsPanelView({
                                            containerRef,
                                            open,
                                            setOpen,
                                            isClosed,
                                            hasNew,
                                            displayCount,
                                            items,
                                            meId,
                                            content,
                                            setContent,
                                            onSubmit,
                                            onUpdate,
                                            onRemove,
                                          }: Props): React.ReactElement {
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

        {open ? (
          <div className="bg-[var(--theme-accent)] px-3 pb-3 pt-2 space-y-3 rounded-2xl">
            <div className="space-y-4">
              {items.map((c) => (
                <div
                  key={String(c.id)}
                  className="rounded-xl border p-2"
                  style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
                >
                  <CommentItem comment={c} meId={meId} update={onUpdate} remove={onRemove} />
                </div>
              ))}
              {items.length === 0 ? (
                <div className="text-[var(--theme-text-white)] text-sm opacity-70">No updates yet.</div>
              ) : null}
            </div>

            <RootComposer
              disabled={isClosed}
              value={content}
              onChange={setContent}
              onSubmit={onSubmit}
            />
          </div>
        ) : null}
      </StopDragGroup>
    </div>
  );
}
