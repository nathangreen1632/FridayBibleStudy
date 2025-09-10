import React, { useEffect, useRef } from 'react';

type Props = {
  open: boolean;
  src: string;
  alt?: string;
  onClose: () => void;
};

export default function LightboxModal({ open, src, alt, onClose }: Readonly<Props>): React.ReactElement | null {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="text"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center"
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />
      <div
        ref={ref}
        className="relative max-w-[95vw] max-h-[90vh] p-2 rounded-2xl bg-[var(--theme-surface)] shadow-xl"
      >
        <img
          src={src}
          alt={alt || 'Photo'}
          className="max-h-[85vh] max-w-[92vw] object-contain rounded-xl"
          loading="eager"
          decoding="async"
        />
        <button
          onClick={onClose}
          className="absolute top-2 right-2 px-3 py-1 rounded-lg bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
