import { create } from 'zustand';
import type { Prayer, Status } from '../types/domain.types';

interface BoardState {
  prayers: Prayer[];
  page: number;
  hasMore: boolean;
  sort: 'name' | 'date' | 'prayer' | 'status';
  q: string;
  filterStatus?: Status;
  filterCategory?: Prayer['category'];
  setPrayers: (items: Prayer[]) => void;
  appendPrayers: (items: Prayer[]) => void;
  setSort: (s: BoardState['sort']) => void;
  setQuery: (q: string) => void;
}

export const useBoardStore = create<BoardState>((set) => ({
  prayers: [],
  page: 1,
  hasMore: true,
  sort: 'date',
  q: '',
  setPrayers: (items) => set({ prayers: items }),
  appendPrayers: (items) => set((s) => ({ prayers: [...s.prayers, ...items] })),
  setSort: (s) => set({ sort: s }),
  setQuery: (q) => set({ q })
}));
