import React from 'react';
import type { Category } from '../../types/domain.types';

interface PrayerCardProps {
  id: number;
  title: string;
  author?: string;
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
    <article className="rounded-2xl bg-white border border-gray-200 shadow-md p-4">
      <header className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900">{title}</h4>
        <span className="text-xs text-gray-500">
          {new Date(createdAt).toLocaleDateString()}
        </span>
      </header>
      <div className="text-sm mt-2 text-gray-700">
        {author ?? 'Unknown'}
      </div>
      <div className="text-xs mt-2 text-gray-500">
        Category: {category}
      </div>
    </article>
  );
}
