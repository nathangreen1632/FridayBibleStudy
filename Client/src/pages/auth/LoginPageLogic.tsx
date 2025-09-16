// Client/src/pages/LoginPageLogic.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../stores/useAuthStore.ts';
import { getRecaptchaToken, loadRecaptchaEnterprise } from '../../lib/recaptcha.lib.ts';
import LoginPageView from '../../jsx/auth/loginPageView.tsx';
import type { FromState } from '../../types/api/auth.types.ts';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

// centralize landing decision
function landingPathForRole(role?: string): string {
  if (role === 'admin') return '/admin';
  return '/portal';
}

export default function LoginPageLogic(): React.ReactElement {
  const nav = useNavigate();
  const loc = useLocation();
  const { login, loading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!SITE_KEY) {
        setReady(true);
        return;
      }
      try {
        await loadRecaptchaEnterprise(SITE_KEY);
        if (mounted) setReady(true);
      } catch {
        if (mounted) {
          toast.error('Security check could not load. You can still try to sign in.');
          setReady(true);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const disabled = useMemo(() => loading || !email || !password, [loading, email, password]);

  async function safeGetRecaptchaToken(): Promise<string | null> {
    if (!SITE_KEY) return null;
    try {
      const token = await getRecaptchaToken(SITE_KEY, 'login');
      return token.length > 0 ? token : null;
    } catch {
      return null;
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const recaptchaToken = ready ? await safeGetRecaptchaToken() : null;
    if (SITE_KEY && !recaptchaToken) {
      toast('Proceeding without security token.', { icon: '⚠️' });
    }

    const { success, message } = await login(email, password /* , recaptchaToken */);

    if (success) {
      toast.success('Welcome back!');

      const role = useAuthStore.getState().user?.role;
      const defaultDest = landingPathForRole(role);

      // normalize "from" state
      const state = loc.state as FromState;
      const rawFrom = state?.from;
      let fromPath = '/';

      if (typeof rawFrom === 'string') {
        fromPath = rawFrom;
      } else if (rawFrom && typeof rawFrom === 'object' && typeof rawFrom.pathname === 'string') {
        fromPath = rawFrom.pathname || '/';
      }

      if (!fromPath.startsWith('/')) fromPath = '/';

      const isNeutral =
        fromPath === '/' || fromPath.startsWith('/login') || fromPath.startsWith('/register');
      const isAdminOnly = fromPath.startsWith('/admin');
      const roleAllowsFrom = role === 'admin' || !isAdminOnly;

      let target = defaultDest;
      if (!isNeutral && roleAllowsFrom) {
        target = fromPath;
      }

      nav(target, { replace: true });
      return;
    }

    const msg = message ?? 'Login failed';
    setErr(msg);
    toast.error(msg);
  }

  return (
    <LoginPageView
      email={email}
      password={password}
      showPw={showPw}
      err={err}
      loading={loading}
      disabled={disabled}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onTogglePw={() => setShowPw((s) => !s)}
      onSubmit={onSubmit}
    />
  );
}
