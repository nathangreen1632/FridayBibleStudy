// Client/src/stores/auth.store.ts
import { create } from 'zustand';
import { api } from '../helpers/http.helper';

type RegisterPayload = {
  name: string;
  phone: string;
  email: string;
  password: string;
  recaptchaToken: string;
};

type AuthState = {
  loading: boolean;
  register: (payload: RegisterPayload) => Promise<{ success: boolean; message?: string }>;
};

export const useAuthStore = create<AuthState>((set) => ({
  loading: false,

  async register(payload) {
    set({ loading: true });
    try {
      const { recaptchaToken, ...body } = payload;

      if (!recaptchaToken) {
        return { success: false, message: 'Missing CAPTCHA token' };
      }

      // Send token in BOTH header and body for maximum compatibility
      await api('/api/auth/register', {
        method: 'POST',
        headers: {
          'X-Recaptcha-Token': recaptchaToken, // middleware checks this
        },
        body: JSON.stringify({ ...body, recaptchaToken }), // …and/or this
      });

      // TODO: set user, navigate, etc.
      return { success: true };
    } catch (err) {
      let msg: string;

      if (err instanceof Error) {
        msg = err.message;
      } else if (typeof err === 'string') {
        msg = err;
      } else {
        msg = 'Registration failed';
      }

      // Graceful return instead of throwing
      return { success: false, message: msg };
    } finally {
      set({ loading: false });
    }
  },
}));
