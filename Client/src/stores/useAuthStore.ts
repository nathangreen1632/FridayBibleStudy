// Client/src/stores/useAuthStore.ts
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

type AuthResult = { success: boolean; message?: string };

type AuthState = {
  loading: boolean;
  user: User | null;

  register: (payload: RegisterPayload) => Promise<AuthResult>;
  me: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<AuthResult>;
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

      // Try to load full profile; if that fails, use the minimal response.
      try {
        const full = await api<User>('/api/auth/me', { method: 'GET' });
        set((state) => ({
          user: state.user
            ? { ...state.user, ...full }
            : { ...full, groupId: full.groupId ?? null },
        }));
      } catch {
        set({ user: { ...res, groupId: res.groupId ?? null } as User });
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
      set((state) => ({
        // merge so partial payloads never wipe existing fields (e.g., groupId)
        user: state.user
          ? ({ ...state.user, ...full } as User)
          : ({ ...full, groupId: full.groupId ?? null } as User),
      }));
    } catch {
      // If we can’t fetch profile, ensure state is safe.
      set({ user: null });
    }
  },

  login: async (email, password) => {
    set({ loading: true });

    try {
      // reCAPTCHA site key is required by backend policy; handle gracefully if missing.
      if (!SITE_KEY) {
        return { success: false, message: 'Missing reCAPTCHA site key. Please contact the administrator.' };
      }

      // Load and obtain token; each step has a graceful fallback message.
      try {
        await loadRecaptchaEnterprise(SITE_KEY);
      } catch {
        return { success: false, message: 'Security check unavailable (reCAPTCHA load failed). Please try again later.' };
      }

      let recaptchaToken = '';
      try {
        recaptchaToken = await getRecaptchaToken(SITE_KEY, 'login');
      } catch {
        return { success: false, message: 'Security token could not be created. Please refresh and try again.' };
      }

      const res = await api<Response>('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-recaptcha-token': recaptchaToken,
        },
        body: JSON.stringify({ email, password, recaptchaToken }),
      });

      // If api() returns a native Response, check ok; otherwise assume it has already parsed/handled.
      if (res instanceof Response) {
        if (!res.ok) {
          const errBody: unknown = await res.json().catch(() => ({}));
          const msg = (typeof errBody === 'object' && errBody && 'error' in errBody)
            ? String((errBody as { error?: unknown }).error ?? 'Login failed')
            : 'Login failed';
          return { success: false, message: msg };
        }
      }

      // Fetch full profile and merge into state.
      try {
        const full = await api<User>('/api/auth/me', { method: 'GET' });
        set((state) => ({
          user: state.user
            ? ({ ...state.user, ...full } as User)
            : ({ ...full, groupId: full.groupId ?? null } as User),
        }));
      } catch {
        // If /me fails right after login, still return success but leave user as-is
        // to avoid breaking the session; UI can call me() later.
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      return { success: false, message: msg };
    } finally {
      set({ loading: false });
    }
  },

  logout: async (): Promise<void> => {
    set({ loading: true });
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      // Intentionally ignore; we still clear local user for a clean UI state.
    } finally {
      set({ user: null, loading: false });
    }
  },

  updateProfile: async (data) => {
    set({ loading: true });
    try {
      const updated = await api<User>('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      // Merge server's canonical user object into state without losing existing fields.
      const prev = get().user ?? {};
      const merged: User = { ...(prev as User), ...updated, groupId: updated.groupId ?? (prev as User).groupId ?? null };
      set({ user: merged });

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Profile update failed';
      return { success: false, message: msg };
    } finally {
      set({ loading: false });
    }
  },
}));
