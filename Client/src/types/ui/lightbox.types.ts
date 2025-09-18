import React from "react";

export type LightboxModalProps = Readonly<{
  open: boolean;
  src: string;
  alt?: string;
  caption?: string | null;
  onClose: () => void;
}>;

export type LightboxModalViewProps = Readonly<{
  open: boolean;
  src: string;
  alt?: string;
  caption?: string | null;
  onClose: () => void;
  imgWidth: number;
  imgRef: React.RefObject<HTMLImageElement | null>;
}>;
