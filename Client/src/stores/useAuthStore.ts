// Client/src/stores/auth.store.ts
import { create } from 'zustand';
import { api } from '../helpers/http.helper';
import { loadRecaptchaEnterprise, getRecaptchaToken } from '../lib/recaptcha.lib';

type User = {
  id: number;
  name: string;
  email: string;
  role: 'classic' | 'admin';
  groupId?: number | null;

  // optional profile fields
  phone?: string | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZip?: string | null;
  spouseName?: string | null;
};

type RegisterPayload = {
  name: string;
  phone: string;
  email: string;
  password: string;
  recaptchaToken: string;
};

type AuthState = {
  loading: boolean;
  user: User | null;

  register: (payload: RegisterPayload) => Promise<{ success: boolean; message?: string }>;
  me: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; message?: string }>;
};

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

export const useAuthStore = create<AuthState>((set, get) => ({
  loading: false,
  user: null,

  register: async (payload) => {
    set({ loading: true });
    try {
      const res = await api<{ id: number; name: string; email: string; role: 'classic'|'admin'; groupId?: number }>(
        '/api/auth/register',
        { method: 'POST', body: JSON.stringify(payload) }
      );

      // Prefer to load the full profile if available, otherwise fall back.
      try {
        const full = await api<User>('/api/auth/me', { method: 'GET' });
        set(state => ({ user: state.user ? { ...state.user, ...full } : { ...full, groupId: full.groupId ?? null } }));
      } catch {
        set({ user: { ...res, groupId: res.groupId ?? null } });
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      return { success: false, message: msg };
    } finally {
      set({ loading: false });
    }
  },

  me: async () => {
    try {
      const full = await api<User>('/api/auth/me', { method: 'GET' });
      set(state => ({
        // merge so partial payloads never wipe existing fields (e.g., groupId)
        user: state.user ? ({ ...state.user, ...full } as User) : ({ ...full, groupId: full.groupId ?? null } as User),
      }));
    } catch {
      set({ user: null });
    }
  },

  login: async (email, password) => {
    set({ loading: true });
    try {
      if (!SITE_KEY) throw new Error('Missing VITE_RECAPTCHA_SITE_KEY');

      await loadRecaptchaEnterprise(SITE_KEY);
      const recaptchaToken = await getRecaptchaToken(SITE_KEY, 'login');

      const res = await api<Response>('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-recaptcha-token': recaptchaToken,
        },
        body: JSON.stringify({ email, password, recaptchaToken }),
      });

      if (res instanceof Response && !res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg = errBody?.error || 'Login failed';
        throw new Error(msg);
      }

      // fetch full profile and MERGE
      const full = await api<User>('/api/auth/me', { method: 'GET' });
      set(state => ({
        user: state.user ? ({ ...state.user, ...full } as User) : ({ ...full, groupId: full.groupId ?? null } as User),
      }));

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      return { success: false, message: msg };
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      await api('/api/auth/logout', { method: 'POST' });
      set({ user: null });
    } finally {
      set({ loading: false });
    }
  },

  updateProfile: async (data) => {
    set({ loading: true });
    try {
      const updated = await api<User>('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      // merge the server's canonical user object into state
      set({ user: { ...(get().user ?? {}), ...updated } as User });
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Profile update failed';
      return { success: false, message: msg };
    } finally {
      set({ loading: false });
    }
  },
}));
