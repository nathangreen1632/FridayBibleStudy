import React from 'react';

export type ModalProps = Readonly<{
  open: boolean;
  onRequestClose?: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}>;
