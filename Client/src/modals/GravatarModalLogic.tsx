import React from 'react';
import type { GravatarModalProps } from '../types/ui/gravatarModal.types.ts';
import GravatarModalView from '../jsx/modals/gravatarModalView.tsx';

export default function GravatarModalLogic({
                                             isOpen,
                                             onClose,
                                           }: GravatarModalProps): React.ReactElement | null {
  if (!isOpen) return null;

  return <GravatarModalView isOpen={isOpen} onClose={onClose} />;
}
