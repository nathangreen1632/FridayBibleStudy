import React from "react";

export type LightboxModalProps = Readonly<{
  open: boolean;
  src: string;
  alt?: string;
  caption?: string | null; // note/footer text
  onClose: () => void;
}>;

export type LightboxModalViewProps = Readonly<{
  open: boolean;
  src: string;
  alt?: string;
  caption?: string | null;
  onClose: () => void;

  // measured width from logic for caption width sync
  imgWidth: number;

  // refs supplied by logic for measurement
  imgRef: React.RefObject<HTMLImageElement | null>;
}>;
