import React, { useMemo } from 'react';
import { useAdminStore } from '../../stores/admin/useAdminStore';
import AdminPrayerSummaryCardView from '../../jsx/admin/adminPrayerSummaryCardView';
import type { AdminPrayerSummaryData } from '../../types/admin/admin.types.ts';

type Props = Readonly<{
  prayerId: number;
  className?: string;
}>;

function formatStatus(s: string): string {
  const coerced = s === 'active' ? 'prayer' : s;
  const first = coerced.charAt(0).toUpperCase();
  return `${first}${coerced.slice(1)}`;
}

export default function AdminPrayerSummaryCardLogic({ prayerId, className }: Props): React.ReactElement {
  const { detailPrayers, detailRows, loading } = useAdminStore();

  const row = detailRows[prayerId];
  const prayer = detailPrayers[prayerId];

  const data: AdminPrayerSummaryData = useMemo(() => {
    let title = 'Untitled';
    const domainTitle = prayer?.title?.trim();
    if (domainTitle && domainTitle.length > 0) title = domainTitle;
    else if (row?.title) title = row.title;

    const authorName = row?.authorName ?? 'Unknown Author';
    const groupName = row?.groupName ?? 'Unknown Group';

    const rawCategory = (row?.category ?? (prayer?.category as string | undefined)) ?? 'prayer';
    const rawStatus = (row?.status ?? (prayer?.status as string | undefined)) ?? 'active';

    const statusDisplay = formatStatus(rawStatus);

    const updatedAt = row?.updatedAt ? new Date(row.updatedAt) : undefined;
    const lastCommentAt = row?.lastCommentAt ? new Date(row.lastCommentAt) : undefined;
    const commentCount = typeof row?.commentCount === 'number' ? row.commentCount : 0;

    const content = prayer?.content ?? '';

    return {
      title,
      authorName,
      groupName,
      category: rawCategory,
      statusDisplay,
      updatedAt,
      lastCommentAt,
      commentCount,
      content,
    };
  }, [row, prayer]);

  return (
    <AdminPrayerSummaryCardView
      className={className}
      loading={loading}
      data={data}
    />
  );
}
