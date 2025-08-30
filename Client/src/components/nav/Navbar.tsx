import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

function linkClass(isActive: boolean): string {
  return [
    'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
    isActive
      ? 'bg-[var(--theme-button)] text-[var(--theme-text-white)]'
      : 'text-[var(--theme-text)] hover:bg-[var(--theme-card-hover)]',
  ].join(' ');
}

export default function Navbar(): React.ReactElement {
  const nav = useNavigate();
  const { user, logout } = useAuthStore();

  async function onLogout() {
    await logout();
    nav('/login', { replace: true });
  }

  return (
    <header className="sticky top-0 z-40 bg-[var(--theme-bg)]/80 backdrop-blur border-b border-[var(--theme-border)]">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand */}
        <NavLink to="/" className="text-lg font-bold text-[var(--theme-accent)]">
          Friday Night Bible Study
        </NavLink>

        {/* Links */}
        <nav className="flex items-center gap-2">
          {/* Public */}
          <NavLink to="/" className={({ isActive }) => linkClass(isActive)} end>
            Home
          </NavLink>

          <NavLink to="/contact" className={({ isActive }) => linkClass(isActive)}>
            Contact
          </NavLink>

          {!user && (
            <>
              <NavLink to="/login" className={({ isActive }) => linkClass(isActive)}>
                Sign in
              </NavLink>
              <NavLink to="/register" className={({ isActive }) => linkClass(isActive)}>
                Create account
              </NavLink>
            </>
          )}

          {/* Authed */}
          {user && (
            <>
              <NavLink to="/portal" className={({ isActive }) => linkClass(isActive)}>
                Portal
              </NavLink>
              <NavLink to="/profile" className={({ isActive }) => linkClass(isActive)}>
                Profile
              </NavLink>

              <button
                onClick={onLogout}
                className="ml-2 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--theme-surface)] border border-[var(--theme-border)] hover:bg-[var(--theme-card-hover)]"
                aria-label="Sign out"
              >
                Sign out
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
