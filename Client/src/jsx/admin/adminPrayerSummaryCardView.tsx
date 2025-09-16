import React from 'react';
import type { AdminPrayerSummaryData } from '../../types/admin/admin.types.ts';

type Props = Readonly<{
  className?: string;
  loading: boolean;
  data: AdminPrayerSummaryData;
}>;

const InfoRow = React.memo(function InfoRow({
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
});

export default function AdminPrayerSummaryCardView({
                                                     className,
                                                     loading,
                                                     data,
                                                   }: Props): React.ReactElement {
  const {
    title,
    authorName,
    groupName,
    category,
    statusDisplay,
    commentCount,
    lastCommentAt,
    updatedAt,
    content,
  } = data;

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
