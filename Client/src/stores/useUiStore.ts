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
    const next = { ...get().modals, [key]: true };
    set({ modals: next });
  },
  closeModal: (key) => {
    const next = { ...get().modals, [key]: false };
    set({ modals: next });
  },
  isOpen: (key) => Boolean(get().modals[key]),
}));
