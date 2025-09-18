import React, { useEffect, useRef, useState } from 'react';
import { useScrollLock } from '../hooks/useScrollLock.ts';
import type { LightboxModalProps } from '../types/ui/lightbox.types.ts';
import LightboxModalView from '../jsx/modals/lightboxModalView.tsx';

export default function LightboxModalLogic({
                                             open,
                                             src,
                                             alt,
                                             caption,
                                             onClose,
                                           }: LightboxModalProps): React.ReactElement | null {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgWidth, setImgWidth] = useState<number>(0);

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        try { onClose();

        } catch {

        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    const el = imgRef.current;
    if (!el) return;

    const initial = el.clientWidth;
    if (Number.isFinite(initial) && initial > 0) setImgWidth(initial);

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

    const onResize = () => {
      const cur = imgRef.current;
      if (!cur) return;
      const w = cur.clientWidth;
      if (Number.isFinite(w) && w > 0) setImgWidth(w);
    };
    window.addEventListener('resize', onResize);

    const onLoad = () => onResize();
    el.addEventListener('load', onLoad, { once: true });

    return () => {
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
    };
  }, [open, src]);

  if (!open) return null;

  return (
    <LightboxModalView
      open={open}
      src={src}
      alt={alt}
      caption={caption}
      onClose={onClose}
      imgWidth={imgWidth}
      imgRef={imgRef}
    />
  );
}
