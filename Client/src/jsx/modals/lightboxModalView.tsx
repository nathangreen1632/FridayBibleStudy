import React from 'react';
import type { LightboxModalViewProps } from '../../types/ui/lightbox.types.ts';

export default function LightboxModalView({
                                            open,
                                            src,
                                            alt,
                                            caption,
                                            onClose,
                                            imgWidth,
                                            imgRef,
                                          }: LightboxModalViewProps): React.ReactElement | null {
  if (!open) return null;

  const hasCaption = typeof caption === 'string' && caption.trim().length > 0;
  const captionStyle = imgWidth > 0 ? { width: `${imgWidth}px` } : undefined;

  return (
    <div
      role="text"
      aria-modal="true"
      aria-label={alt || 'Photo lightbox'}
      className="fixed inset-0 z-[100] flex items-center justify-center"
    >
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />

      {/* Shell */}
      <div className="relative max-w-[95vw] max-h-[90vh] p-2 rounded-2xl bg-[var(--theme-surface)] shadow-xl">
        <div className="flex flex-col items-center">
          <img
            ref={imgRef}
            src={src}
            alt={alt || 'Photo'}
            className="block max-h-[75vh] max-w-[92vw] object-contain rounded-xl"
            loading="eager"
            decoding="async"
          />

          {hasCaption ? (
            <div
              className="mt-2 box-border px-3 py-2 text-sm italic bg-[var(--theme-card-alt)] text-[var(--theme-text)] border border-[var(--theme-border)] rounded-lg break-words whitespace-pre-wrap"
              style={captionStyle}
            >
              {caption}
            </div>
          ) : null}
        </div>

        <button
          onClick={onClose}
          className="absolute top-2 right-2 px-3 py-1 rounded-lg bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
