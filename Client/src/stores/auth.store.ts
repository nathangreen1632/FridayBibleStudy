// imports unchanged
import { create } from 'zustand';
import { api } from '../helpers/http.helper';

type RegisterPayload = {
  name: string;
  phone: string;
  email: string;
  password: string;
  recaptchaToken: string; // ← add this
};

type AuthState = {
  loading: boolean;
  // ... other state
  register: (payload: RegisterPayload) => Promise<void>; // ← update signature
};

export const useAuthStore = create<AuthState>((set, _get) => ({
  loading: false,
  // ...other state & actions

  async register(payload) {
    set({ loading: true });
    try {
      const { recaptchaToken, ...body } = payload;

      // Send token to server — pick ONE approach your backend expects:

      // A) Header (common with Enterprise):
      await api('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Recaptcha-Token': recaptchaToken, // ← header name your server verifies
        },
        body: JSON.stringify(body),
      });

      // B) Or include in body (if your server expects it there):
      // await api('/api/auth/register', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ ...body, recaptchaToken }),
      // });

      // ...handle success (set user, navigate, etc.)
    } finally {
      set({ loading: false });
    }
  },
}));
