import React from 'react';

export type ModalProps = Readonly<{
  open: boolean;
  /** Called when user tries to close (e.g., ESC). Parent decides whether to proceed. */
  onRequestClose?: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}>;
