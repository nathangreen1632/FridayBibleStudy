import React, { useMemo } from 'react';
import type { Category } from '../../../types/domain/domain.types.ts';

interface PrayerCardProps {
  id: number;
  title: string;
  content: string;
  author?: string | null;
  category: Category;
  createdAt: string;
}

function formatDate(value: string): string {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString();
  } catch {
    return '—';
  }
}

export default function PrayerCard(props: Readonly<PrayerCardProps>): React.ReactElement {
  const { id, title, content, author, category, createdAt } = props;

  const display = useMemo(() => {
    try {
      const safeTitle = title.trim().length ? title : 'Untitled';
      const safeContent = content;
      const safeAuthor =
        typeof author === 'string' && author.trim().length ? author : 'Unknown';
      const safeCategory = (category as string) || 'uncategorized';
      const safeDate = formatDate(createdAt);

      return { ok: true as const, safeTitle, safeContent, safeAuthor, safeCategory, safeDate };
    } catch {
      return { ok: false as const };
    }
  }, [title, content, author, category, createdAt]);

  if (!display.ok) {
    return (
      <article
        className="
          rounded-xl border border-[var(--theme-border)]
          bg-[var(--theme-card)]
          p-3 sm:p-4
          shadow-sm
        "
        data-card-id={id}
        data-error="render"
      >
        <header className="flex items-center justify-between">
          <h4 className="font-semibold text-[var(--theme-text)] text-sm sm:text-base">
            Card Error
          </h4>
          <span className="text-[11px] sm:text-xs opacity-60">#{id}</span>
        </header>
        <p className="text-xs sm:text-sm mt-2 opacity-80 leading-relaxed">
          Failed to render this card.
        </p>
      </article>
    );
  }

  return (
    <article
      className="
        rounded-xl border border-[var(--theme-border)]
        bg-[var(--theme-accent)]
        p-3 sm:p-4
        shadow-sm
      "
      data-card-id={id}
      data-category={display.safeCategory}
      data-created={createdAt}
    >
      <header className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-[var(--theme-text-white)] text-sm sm:text-2xl truncate">
          {display.safeTitle}
        </h2>
        <span className="text-[var(--theme-text-white)] text-[11px] sm:text-base opacity-60 whitespace-nowrap">
          {display.safeDate}
        </span>
      </header>

      <p className="text-[var(--theme-text-white)] text-xs sm:text-lg mt-2 opacity-90 whitespace-pre-line leading-relaxed">
        {display.safeContent}
      </p>

      <div className="text-[var(--theme-text-white)] text-xs sm:text-base mt-2 opacity-80">
        Author: {display.safeAuthor}
      </div>
      <div className="text-[var(--theme-text-white)] text-[11px] sm:text-xs mt-2 opacity-60">
        {display.safeCategory}
      </div>
    </article>
  );
}
