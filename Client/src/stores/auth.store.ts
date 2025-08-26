import { create } from 'zustand';
import type { AuthUser } from '../types/api.type';
import { api } from '../helpers/http.helper';

interface AuthState {
  user?: AuthUser;
  loading: boolean;
  login: (email: string, password: string, recaptchaToken: string) => Promise<void>;
  register: (p: {name:string;phone:string;email:string;password:string}, recaptchaToken: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  loading: false,
  async login(email, password, recaptchaToken) {
    set({ loading: true });
    try {
      const user = await api<AuthUser>('/api/auth/login', {
        method: 'POST',
        headers: { 'x-recaptcha-token': recaptchaToken },
        body: JSON.stringify({ email, password })
      });
      set({ user });
    } finally { set({ loading: false }); }
  },
  async register(p, recaptchaToken) {
    set({ loading: true });
    try {
      const user = await api<AuthUser>('/api/auth/register', {
        method: 'POST',
        headers: { 'x-recaptcha-token': recaptchaToken },
        body: JSON.stringify(p)
      });
      set({ user });
    } finally { set({ loading: false }); }
  },
  async logout() {
    await api('/api/auth/logout', { method: 'POST' });
    set({ user: undefined });
  },
  async hydrate() {
    try { const me = await api<{ userId:number; role:'classic'|'admin' }>('/api/auth/me'); set({ user: { id: me.userId, name: '', email: '', role: me.role } as AuthUser }); }
    catch { /* not logged in */ }
  }
}));
