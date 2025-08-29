// Client/src/components/board/PrayerCard.board.tsx
import React from 'react';
import type { Category } from '../../types/domain.types';

interface PrayerCardProps {
  id: number;
  title: string;
  content: string; // ⬅️ added
  author?: string | null;
  category: Category;
  createdAt: string;
}

export default function PrayerCard({
                                     title,
                                     content,
                                     author,
                                     category,
                                     createdAt,
                                   }: Readonly<PrayerCardProps>): React.ReactElement {
  return (
    <article className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-accent)] p-4 shadow-sm">
      <header className="flex items-center justify-between">
        <h4 className="font-semibold text-[var(--theme-text-white)]">{title}</h4>
        <span className="text-[var(--theme-text-white)] text-xs opacity-60">
          {new Date(createdAt).toLocaleDateString()}
        </span>
      </header>

      {/* body of the message */}
      <p className="text-[var(--theme-text-white)] text-sm mt-2 opacity-90 whitespace-pre-line">
        {content}
      </p>

      <div className="text-[var(--theme-text-white)] text-sm mt-2 opacity-80">
       Author: {author || 'Unknown'}
      </div>
      <div className="text-[var(--theme-text-white)] text-xs mt-2 opacity-60">
        {category}
      </div>
    </article>
  );
}
