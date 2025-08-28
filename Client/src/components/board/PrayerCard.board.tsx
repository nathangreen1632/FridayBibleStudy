import React from 'react';
import type { Category } from '../../types/domain.types';

interface PrayerCardProps {
  id: number;
  title: string;
  author?: string | null;
  category: Category;
  createdAt: string;
}

export default function PrayerCard({
                                     title,
                                     author,
                                     category,
                                     createdAt,
                                   }: Readonly<PrayerCardProps>): React.ReactElement {
  return (
    <article className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-sm">
      <header className="flex items-center justify-between">
        <h4 className="font-semibold text-[var(--theme-text)]">{title}</h4>
        <span className="text-xs opacity-60">
          {new Date(createdAt).toLocaleDateString()}
        </span>
      </header>

      <div className="text-sm mt-2 opacity-80">
        {author || 'Unknown'}
      </div>
      <div className="text-xs mt-2 opacity-60">
        Category: {category}
      </div>
    </article>
  );
}
