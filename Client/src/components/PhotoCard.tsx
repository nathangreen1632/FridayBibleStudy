import React from 'react';
import type { Photo } from '../types/photo.types';
import { useAuthStore } from '../stores/useAuthStore';
import { Trash2 } from 'lucide-react';

type Props = {
  photo: Photo;
  onDelete: (id: number) => void;
};

function canDelete(currentUserId?: number, currentRole?: string, ownerId?: number): boolean {
  if (!currentUserId) return false;
  if (currentRole === 'admin') return true;
  return currentUserId === ownerId;
}

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
  } catch {
    return '';
  }
}

export default function PhotoCard({ photo, onDelete }: Readonly<Props>): React.ReactElement {
  const auth = useAuthStore();
  const deletable = canDelete(auth.user?.id, auth.user?.role, photo.userId);

  return (
    <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="aspect-[4/3] bg-[var(--theme-card-alt)] flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={photo.filename || 'Photo'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Footer meta + actions */}
      <div className="p-2 flex items-center justify-between gap-2">
        <div className="text-xs opacity-70">
          <div className="text-[var(--theme-text)]">
            Uploaded by <span className="font-medium">{photo.uploaderName || 'Unknown'}</span>
          </div>
          <div className="text-[var(--theme-text)]">{formatWhen(photo.createdAt)}</div>
        </div>

        {deletable && (
          <button
            type="button"
            onClick={() => onDelete(photo.id)}
            className="px-2 py-1 rounded-lg border border-[var(--theme-border)] hover:bg-[var(--theme-button-hover)]"
            aria-label="Delete photo"
            title="Delete photo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
