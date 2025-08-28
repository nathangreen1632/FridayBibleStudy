import React, { useState } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { useNavigate, useLocation, Link } from 'react-router-dom';

export default function Login(): React.ReactElement {
  const nav = useNavigate();
  const loc = useLocation();
  const { login, loading } = useAuthStore();

  const [email, setEmail] = useState('testuser@example.com');
  const [password, setPassword] = useState('Password123!');
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const { success, message } = await login(email, password);
    if (success) {
      const to = (loc.state)?.from ?? '/portal';
      nav(to, { replace: true });
    } else {
      setErr(message ?? 'Login failed');
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 space-y-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <form className="space-y-3" onSubmit={onSubmit}>
        <label className="block">
          <span className="text-sm">Email</span>
          <input
            className="w-full border p-2 rounded"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="text-sm">Password</span>
          <input
            className="w-full border p-2 rounded"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {err && <p className="text-red-600">{err}</p>}

        <button className="px-4 py-2 bg-black text-white rounded" disabled={loading} type="submit">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-sm">
        No account? <Link to="/register" className="underline">Register</Link>
      </p>
    </div>
  );
}
