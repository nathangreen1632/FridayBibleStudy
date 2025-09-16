// Client/src/App.tsx
import React, { useEffect, useState } from 'react';
import AppRoutes from './AppRoutes';
import { Toaster } from 'react-hot-toast';
import Navbar from './common/Navbar.tsx';
import Footer from './common/Footer.tsx';
import GravatarStrip from './components/profile/GravatarStrip.tsx';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';

/**
 * Bootstraps authentication once on app mount.
 * We block route rendering until /api/auth/me resolves so guards
 * do not spuriously redirect when user is still null during boot.
 */
function AuthBootstrap({ children }: Readonly<{ children: React.ReactElement }>) {
  const me = useAuthStore((s) => s.me);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let alive = true;
    // Best-effort hydrate current session from HttpOnly cookie
    me()
      .catch(() => {
        // swallow: guards will handle unauthenticated flow
      })
      .finally(() => {
        if (alive) setBooting(false);
      });
    return () => {
      alive = false;
    };
  }, [me]);

  if (booting) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--theme-bg)]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div
            className={[
              'rounded-2xl border border-[var(--theme-border)]',
              'bg-[var(--theme-surface)] shadow-sm px-6 py-5',
              'text-[var(--theme-text)]'
            ].join(' ')}
            aria-busy="true"
            aria-live="polite"
          >
            <div className="flex items-center gap-3">
              {/* simple spinner */}
              <span
                className={[
                  'inline-block h-5 w-5 rounded-full border-2',
                  'border-[var(--theme-border)] border-t-[var(--theme-button-hover)]',
                  'animate-spin'
                ].join(' ')}
              />
              <span className="font-semibold">Loading…</span>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return children;
}

export default function App(): React.ReactElement {
  const loc = useLocation();

  // Only widen the Admin Roster page
  let mainWidth = 'max-w-7xl 2xl:max-w-[80rem]';
  if (loc.pathname.startsWith('/admin/roster')) {
    // slightly wider, adjust to taste
    mainWidth = 'max-w-[88rem] 2xl:max-w-[96rem]';
  }

  return (
    <AuthBootstrap>
      <div className="min-h-screen flex flex-col bg-[var(--theme-bg)]">
        {/* Header */}
        <Navbar />
        <GravatarStrip />

        {/* Page content grows to push footer down */}
        <main className={['flex-grow w-full mx-auto', mainWidth].join(' ')}>
          <AppRoutes />
        </main>

        {/* Footer always at the bottom */}
        <Footer />
        <Toaster
          toastOptions={{
            style: {
              background: 'var(--theme-surface)',
              color: 'var(--theme-text)',
              border: '1px solid var(--theme-border)',
            },
          }}
        />
      </div>
    </AuthBootstrap>
  );
}
