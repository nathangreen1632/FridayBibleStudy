// Client/src/jsx/admin/adminPrayerDetailPageView.tsx
import React from 'react';
import { Trash2 } from 'lucide-react';
import ConfirmBar from '../../common/ConfirmBar';
import { pressBtn } from '../../../ui/press';
import type { AdminPrayerDetailViewProps } from '../../types/admin/adminPrayerDetail.types.ts';

const STATUS_OPTIONS = ['active', 'praise', 'archived'] as const;
type Status = typeof STATUS_OPTIONS[number];

function isStatus(v: string): v is Status {
  return (STATUS_OPTIONS as readonly string[]).includes(v);
}

export default function AdminPrayerDetailPageView({
                                                    isAdmin,
                                                    content,
                                                    localStatus,
                                                    showDeleteConfirm,
                                                    items,
                                                    statusSelectId,
                                                    updateTextareaId,
                                                    onBack,
                                                    onPost,
                                                    onSetStatus,
                                                    onClickDelete,
                                                    onConfirmDelete,
                                                    onCancelDelete,
                                                    onChangeStatus,
                                                    onChangeContent,
                                                    onDeleteUpdate,
                                                  }: AdminPrayerDetailViewProps): React.ReactElement {

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (isStatus(v)) {
      onChangeStatus(v);            // fully typed as Status
    } else {
      onChangeStatus(localStatus);  // graceful fallback: keep current
    }
  };

  return (
    <div className="space-y-4">
      {/* Back button row */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className={pressBtn(
            'rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)] px-3 py-1.5 text-sm hover:text-[var(--theme-textbox)] hover:bg-[var(--theme-button-hover)] transition-colors duration-200'
          )}
        >
          ← Back to list
        </button>
      </div>

      {/* Status + destructive controls */}
      <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl p-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div>
            <label htmlFor={statusSelectId} className="block text-sm mb-1">
              Status
            </label>
            <select
              id={statusSelectId}
              value={localStatus}
              onChange={handleStatusChange}
              className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] placeholder:text-[var(--theme-placeholder)] px-3 py-2"
            >
              <option value="active">Prayer</option>
              <option value="praise">Praise</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSetStatus}
              className={pressBtn(
                'rounded-xl bg-[var(--theme-button)] text-[var(--theme-text-white)] px-4 py-2 hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)] transition-colors duration-200'
              )}
            >
              Update Status
            </button>

            <button
              type="button"
              onClick={onClickDelete}
              className={pressBtn(
                'rounded-xl bg-[var(--theme-error)] text-[var(--theme-textbox)] px-4 py-2 hover:bg-[var(--theme-button-error)] transition-colors duration-200'
              )}
              aria-label="Delete prayer"
            >
              Delete
            </button>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="mt-3 border-t border-[var(--theme-border)] pt-3">
            <ConfirmBar
              message="Delete this prayer and all its updates? This cannot be undone."
              cancelLabel="Cancel"
              confirmLabel="Delete"
              onCancel={onCancelDelete}
              onConfirm={onConfirmDelete}
            />
          </div>
        )}
      </div>

      {/* Add Admin Update */}
      <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl p-3">
        <h3 className="font-semibold mb-2">Add Admin Update</h3>

        <label htmlFor={updateTextareaId} className="sr-only">
          Admin update content
        </label>
        <textarea
          id={updateTextareaId}
          className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-textbox)] text-[var(--theme-placeholder)] placeholder:text-[var(--theme-placeholder)] px-3 py-2"
          rows={3}
          value={content}
          onChange={(e) => onChangeContent(e.target.value)}
          placeholder="Post an admin update…"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={onPost}
            className={pressBtn(
              'rounded-xl bg-[var(--theme-button)] text-[var(--theme-text-white)] px-4 py-2 hover:text-[var(--theme-textbox)] hover:bg-[var(--theme-button-hover)] transition-colors duration-200'
            )}
          >
            Post
          </button>
        </div>
      </div>

      {/* Updates list with ADMIN-ONLY delete per update */}
      <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl">
        <div className="p-3 font-semibold">Updates</div>
        <ul className="divide-y divide-[var(--theme-border)]">
          {items.map((c) => {
            const when = new Date(c.createdAt).toLocaleString();
            return (
              <li key={String(c.id)} className="p-3 relative">
                <div className="text-sm opacity-80">{when}</div>
                <div className="pr-10">{c.content}</div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => onDeleteUpdate(Number(c.id))}
                    className="absolute top-2 right-2 p-2 rounded-full"
                    aria-label="Delete update"
                    title="Delete update"
                  >
                    <Trash2
                      size={22}
                      className="opacity-80 text-[var(--theme-error)] hover:text-[var(--theme-button-error)] transition-colors duration-200"
                    />
                  </button>
                )}
              </li>
            );
          })}
          {!items.length && <li className="p-3">No updates yet.</li>}
        </ul>
      </div>
    </div>
  );
}
