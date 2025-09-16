// Client/src/modals/LightboxModal.tsx
import React, { useEffect, useRef, useState } from 'react';

type Props = {
  open: boolean;
  src: string;
  alt?: string;
  caption?: string | null; // note/footer text
  onClose: () => void;
};

export default function LightboxModal({
                                        open,
                                        src,
                                        alt,
                                        caption,
                                        onClose,
                                      }: Readonly<Props>): React.ReactElement | null {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgWidth, setImgWidth] = useState<number>(0);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Track the rendered width of the image (portrait/landscape)
  useEffect(() => {
    if (!open) return;

    const el = imgRef.current;
    if (!el) return;

    // initial measure (cached images)
    const initial = el.clientWidth;
    if (Number.isFinite(initial) && initial > 0) setImgWidth(initial);

    // ResizeObserver (reads from current ref each time to satisfy TS)
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        const cur = imgRef.current;
        if (!cur) return;
        const w = Math.floor(cur.clientWidth);
        if (Number.isFinite(w) && w > 0) setImgWidth(w);
      });
      ro.observe(el);
    }

    // Fallback on window resize (read from current ref, not closed-over `el`)
    function onResize() {
      const cur = imgRef.current;
      if (!cur) return;
      const w = cur.clientWidth;
      if (Number.isFinite(w) && w > 0) setImgWidth(w);
    }
    window.addEventListener('resize', onResize);

    // Capture size once the image finishes loading
    const onLoad = () => onResize();
    el.addEventListener('load', onLoad, { once: true });

    return () => {
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
    };
  }, [open, src]);

  if (!open) return null;

  const hasCaption = typeof caption === 'string' && caption.trim().length > 0;
  const captionStyle = imgWidth > 0 ? { width: `${imgWidth}px` } : undefined;

  return (
    <div
      role="text"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />
      <div
        ref={shellRef}
        className="relative max-w-[95vw] max-h-[90vh] p-2 rounded-2xl bg-[var(--theme-surface)] shadow-xl"
      >
        <div className="flex flex-col items-center">
          <img
            ref={imgRef}
            src={src}
            alt={alt || 'Photo'}
            className="block max-h-[75vh] max-w-[92vw] object-contain rounded-xl"
            loading="eager"
            decoding="async"
          />

          {hasCaption && (
            <div
              className="mt-2 box-border px-3 py-2 text-sm italic bg-[var(--theme-card-alt)] text-[var(--theme-text)] border border-[var(--theme-border)] rounded-lg break-words whitespace-pre-wrap"
              style={captionStyle} // exactly matches current image width
            >
              {caption}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="absolute top-2 right-2 px-3 py-1 rounded-lg up bg-[var(--theme-button)] text-[var(--theme-text-white)] hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
