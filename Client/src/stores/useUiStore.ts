import { create } from 'zustand';

export type ModalKey = 'profile';

interface UiState {
  modals: Record<string, boolean>;
  openModal: (key: ModalKey) => void;
  closeModal: (key: ModalKey) => void;
  isOpen: (key: ModalKey) => boolean;
}

export const useUiStore = create<UiState>((set, get) => ({
  modals: {},

  openModal: (key) => {
    try {
      const current = get().modals ?? {};
      const next = { ...current, [key]: true };
      set({ modals: next });
    } catch {
      set({ modals: { [key]: true } });
    }
  },

  closeModal: (key) => {
    try {
      const current = get().modals ?? {};
      const next = { ...current, [key]: false };
      set({ modals: next });
    } catch {
      set({ modals: { [key]: false } });
    }
  },

  isOpen: (key) => {
    try {
      return Boolean(get().modals?.[key]);
    } catch {
      return false;
    }
  },
}));
