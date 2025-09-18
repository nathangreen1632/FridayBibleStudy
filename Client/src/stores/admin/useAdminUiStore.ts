import { create } from 'zustand';

type AdminUiState = {
  q: string;
  groupId?: number;
  status?: 'active'|'praise'|'archived';
  category?: 'prayer'|'long-term'|'salvation'|'pregnancy'|'birth'|'praise';
  page: number;
  pageSize: number;
  set: (patch: Partial<AdminUiState>) => void;
};

export const useAdminUiStore = create<AdminUiState>((set) => ({
  q: '',
  page: 1,
  pageSize: 10,
  set: (patch) => set((s) => ({ ...s, ...patch })),
}));
