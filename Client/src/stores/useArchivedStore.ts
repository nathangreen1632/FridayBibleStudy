import { create } from 'zustand';
import { api } from '../helpers/http.helper';

type ItemId = number;

type State = {
  ids: ItemId[];
  loading: boolean;
  error: string | null;
  total: number;
  load: () => Promise<void>;
};

type ListResp = {
  items: Array<{ id: number; position: number | null }>;
  total: number;
};

function sortByPosition(a: { position: number | null }, b: { position: number | null }): number {
  const av = typeof a.position === 'number' ? a.position : Number.MAX_SAFE_INTEGER;
  const bv = typeof b.position === 'number' ? b.position : Number.MAX_SAFE_INTEGER;
  if (av < bv) return -1;
  if (av > bv) return 1;
  return 0;
}

export const useArchivedStore = create<State>((set) => ({
  ids: [],
  loading: false,
  error: null,
  total: 0,

  async load() {
    set({ loading: true, error: null });
    try {
      // large pageSize is fine; server should cap (we cap on server to 100)
      const data = await api<ListResp>('/api/prayers?page=1&pageSize=100&status=archived');
      const ids = (data.items ?? []).sort(sortByPosition).map((p) => p.id);
      set({ ids, total: data.total ?? ids.length, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load archived prayers';
      set({ error: message, loading: false });
    }
  },
}));
