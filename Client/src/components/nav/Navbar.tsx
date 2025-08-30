// Client/src/components/nav/Navbar.tsx
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import {
  Home,
  Mail,
  LogIn,
  UserPlus,
  LayoutDashboard,
  User,
  LogOut,
  Menu, // ← hamburger icon
} from 'lucide-react';

function linkClass(isActive: boolean): string {
  return [
    'flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
    isActive
      ? 'bg-[var(--theme-button)] text-[var(--theme-text-white)]'
      : 'text-[var(--theme-text)] hover:bg-[var(--theme-card-hover)]',
  ].join(' ');
}

export default function Navbar(): React.ReactElement {
  const nav = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // close menu on any route change
    setOpen(false);
  }, [location.pathname]);

  async function onLogout() {
    await logout();
    nav('/', { replace: true });
  }

  function closeMenu() {
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 bg-[var(--theme-bg)]/80 backdrop-blur border-b border-[var(--theme-border)]">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand */}
        <NavLink to="/" className="text-lg font-bold text-[var(--theme-accent)]">
          Friday Night Bible Study
        </NavLink>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2">
          {/* Public */}
          <NavLink to="/" className={({ isActive }) => linkClass(isActive)} end>
            <Home className="w-4 h-4" />
            Home
          </NavLink>

          <NavLink to="/contact" className={({ isActive }) => linkClass(isActive)}>
            <Mail className="w-4 h-4" />
            Contact
          </NavLink>

          {!user && (
            <>
              <NavLink to="/login" className={({ isActive }) => linkClass(isActive)}>
                <LogIn className="w-4 h-4" />
                Sign in
              </NavLink>
              <NavLink to="/register" className={({ isActive }) => linkClass(isActive)}>
                <UserPlus className="w-4 h-4" />
                Create account
              </NavLink>
            </>
          )}

          {user && (
            <>
              <NavLink to="/portal" className={({ isActive }) => linkClass(isActive)}>
                <LayoutDashboard className="w-4 h-4" />
                Portal
              </NavLink>
              <NavLink to="/profile" className={({ isActive }) => linkClass(isActive)}>
                <User className="w-4 h-4" />
                Profile
              </NavLink>

              <button
                onClick={onLogout}
                className="ml-2 flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--theme-surface)] border border-[var(--theme-border)] hover:bg-[var(--theme-card-hover)]"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </>
          )}
        </nav>

        {/* Mobile dropdown toggle */}
        <div className="md:hidden">
          <button
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            className="p-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-[var(--theme-card-hover)]"
          >
            <Menu className="w-5 h-5 text-[var(--theme-text)]" />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 space-y-2">
          <NavLink to="/" className={({ isActive }) => linkClass(isActive)} end onClick={closeMenu}>
            <Home className="w-4 h-4" />
            Home
          </NavLink>

          <NavLink to="/contact" className={({ isActive }) => linkClass(isActive)} onClick={closeMenu}>
            <Mail className="w-4 h-4" />
            Contact
          </NavLink>

          {!user && (
            <>
              <NavLink to="/login" className={({ isActive }) => linkClass(isActive)} onClick={closeMenu}>
                <LogIn className="w-4 h-4" />
                Sign in
              </NavLink>
              <NavLink to="/register" className={({ isActive }) => linkClass(isActive)} onClick={closeMenu}>
                <UserPlus className="w-4 h-4" />
                Create account
              </NavLink>
            </>
          )}

          {user && (
            <>
              <NavLink to="/portal" className={({ isActive }) => linkClass(isActive)} onClick={closeMenu}>
                <LayoutDashboard className="w-4 h-4" />
                Portal
              </NavLink>
              <NavLink to="/profile" className={({ isActive }) => linkClass(isActive)} onClick={closeMenu}>
                <User className="w-4 h-4" />
                Profile
              </NavLink>
              <button
                onClick={() => { closeMenu(); onLogout(); }}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--theme-surface)] border border-[var(--theme-border)] hover:bg-[var(--theme-card-hover)]"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
