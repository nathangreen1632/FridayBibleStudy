// Client/src/stores/auth.store.ts
import { create } from 'zustand';
import { api } from '../helpers/http.helper';
import { loadRecaptchaEnterprise, getRecaptchaToken } from '../lib/recaptcha.lib';

type User = {
  id: number;
  name: string;
  email: string;
  role: 'classic' | 'admin';
  // optional profile fields (when /auth/profile returns them)
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

  // unchanged register (uses body.recaptchaToken)
  register: async (payload) => {
    set({ loading: true });
    try {
      const res = await api<{ id: number; name: string; email: string; role: 'classic'|'admin' }>(
        '/api/auth/register',
        { method: 'POST', body: JSON.stringify(payload) }
      );
      set({ user: res });
      return { success: true };
    } catch (err: unknown) {
      let msg: string;
      if (err instanceof Error) msg = err.message;
      else if (typeof err === 'string') msg = err;
      else msg = 'Registration failed';
      return { success: false, message: msg };
    } finally {
      set({ loading: false });
    }
  },

  // who am I?
  me: async () => {
    try {
      const me = await api<{ userId: number; role: 'classic' | 'admin' }>('/api/auth/me', { method: 'GET' });
      set({
        user: {
          id: me.userId,
          name: 'User', // will be populated after /auth/profile
          email: '',    // unknown until profile load/update
          role: me.role,
        },
      });
    } catch {
      set({ user: null });
    }
  },

  // login with reCAPTCHA Enterprise (header + body), then hydrate via /me
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
        // NOTE: api() should default to same-origin credentials; do not override to omit
      });

      // If your api() already throws on !ok, you won't reach here on 400.
      // If it returns Response on error, detect it and parse error text:
      if (res instanceof Response && !res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg = errBody?.error || 'Login failed';
        throw new Error(msg);
      }

      // Cookie is httpOnly; hydrate via /me
      const me = await api<{ userId: number; role: 'classic' | 'admin' }>('/api/auth/me');
      set({ user: { id: me.userId, name: '', email, role: me.role } });

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
      set({ user: { ...get().user, ...updated } as User });
      return { success: true };
    } catch (err: unknown) {
      let msg: string;
      if (err instanceof Error) msg = err.message;
      else if (typeof err === 'string') msg = err;
      else msg = 'Profile update failed';
      return { success: false, message: msg };
    } finally {
      set({ loading: false });
    }
  },
}));
