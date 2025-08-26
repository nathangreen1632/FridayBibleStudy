import React from 'react';
import type { Category } from '../../types/domain.types'; // adjust if your file is named differently

interface PrayerCardProps {
  id: number;
  title: string;
  author?: string;
  category: Category;
  createdAt: string; // ISO string from API
}

export default function PrayerCard({
                                     title,
                                     author,
                                     category,
                                     createdAt
                                   }: Readonly<PrayerCardProps>): React.ReactElement {
  return (
    <article className="rounded-2xl bg-white/5 border border-white/10 p-3">
      <header className="flex items-center justify-between">
        <h4 className="font-semibold">{title}</h4>
        <span className="text-xs opacity-70">
          {new Date(createdAt).toLocaleDateString()}
        </span>
      </header>
      <div className="text-xs mt-1 opacity-80">{author ?? 'Unknown'}</div>
      <div className="text-xs mt-1 opacity-70">Category: {category}</div>
    </article>
  );
}
