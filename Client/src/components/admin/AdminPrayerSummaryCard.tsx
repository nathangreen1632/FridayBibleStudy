// Client/src/components/admin/AdminPrayerSummaryCard.tsx
import React from 'react';
import { useAdminStore } from '../../stores/admin/useAdminStore';

type Props = {
  prayerId: number;
  className?: string;
};

function formatStatus(s: string): string {
  const coerced = s === 'active' ? 'prayer' : s;
  return coerced.charAt(0).toUpperCase() + coerced.slice(1);
}

export default function AdminPrayerSummaryCard({
                                                 prayerId,
                                                 className,
                                               }: Readonly<Props>): React.ReactElement {
  const { detailPrayers, detailRows, loading } = useAdminStore();

  const row = detailRows[prayerId];
  const prayer = detailPrayers[prayerId];

  const title =
    (prayer?.title && prayer.title.trim().length > 0 ? prayer.title : row?.title) ?? 'Untitled';

  // NOTE: these exist on the row, not on the domain Prayer
  const authorName = row?.authorName ?? 'Unknown Author';
  const groupName = row?.groupName ?? 'Unknown Group';

  const category = row?.category ?? (prayer?.category as string) ?? 'prayer';
  const status = row?.status ?? (prayer?.status as string) ?? 'active';
  const statusDisplay = formatStatus(status);
  const updatedAt = row?.updatedAt ? new Date(row.updatedAt) : undefined;
  const lastCommentAt = row?.lastCommentAt ? new Date(row.lastCommentAt) : undefined;
  const commentCount = typeof row?.commentCount === 'number' ? row.commentCount : 0;

  const content = prayer?.content ?? '';

  function InfoRow({
                     label,
                     value,
                   }: Readonly<{ label: string; value?: React.ReactNode }>): React.ReactElement | null {
    if (!value && value !== 0) return null;
    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
        <span className="text-xs sm:text-sm opacity-80">{label}:</span>
        <span className="text-sm sm:text-base">{value}</span>
      </div>
    );
  }

  return (
    <div
      className={[
        'w-full rounded-2xl shadow-md',
        'bg-[var(--theme-surface)] text-[var(--theme-text)]',
        'border border-[var(--theme-border)]',
        'p-4 sm:p-5',
        className ?? '',
      ].join(' ')}
      aria-busy={loading ? 'true' : 'false'}
    >
      <div className="mb-3 sm:mb-4">
        <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">{title}</h2>
        <div className="mt-1 text-sm opacity-80">
          by {authorName} • {groupName}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 mb-4">
        <InfoRow label="Category" value={category} />
        <InfoRow label="Status" value={statusDisplay} />
        <InfoRow label="Comments" value={commentCount} />
        <InfoRow label="Last Comment" value={lastCommentAt ? lastCommentAt.toLocaleString() : '—'} />
        <InfoRow label="Updated" value={updatedAt ? updatedAt.toLocaleString() : '—'} />
      </div>

      <div className="rounded-xl bg-[var(--theme-card-alt)] p-3 sm:p-4 custom-scrollbar max-h-72 overflow-auto">
        {content ? (
          <p className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base">{content}</p>
        ) : (
          <p className="italic opacity-70 text-sm">No content provided for this prayer.</p>
        )}
      </div>
    </div>
  );
}
