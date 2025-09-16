// Client/src/common/ConfirmBar.tsx
import React from 'react';
import {pressBtn} from "../../ui/press.ts";

type ConfirmBarProps = {
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmBar({
                                     message = 'You have unsaved changes. Exit without saving?',
                                     confirmLabel = 'Exit without saving',
                                     cancelLabel = 'Keep editing',
                                     onConfirm,
                                     onCancel,
                                   }: Readonly<ConfirmBarProps>): React.ReactElement {
  return (
    <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <div className="flex-1 text-sm sm:text-base text-[var(--theme-error)]">
        {message}
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className={pressBtn("rounded-xl bg-[var(--theme-button-dark)] text-[var(--theme-text)] px-4 py-2 hover:bg-[var(--theme-button-hover)] hover:text-[var(--theme-textbox)]")}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={pressBtn("rounded-xl bg-[var(--theme-error)] text-[var(--theme-textbox)] px-4 py-2 hover:bg-[var(--theme-button-error)]")}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
