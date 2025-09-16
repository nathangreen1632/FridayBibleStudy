// Client/src/common/Navbar.tsx
import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore.ts';
import {
  Mail,
  LogIn,
  UserPlus,
  HelpingHand,
  User,
  LogOut,
  Menu,
  Archive,
  Sparkles,
  ShieldCheck,
  Users,
  Image as ImageIcon,
  BookOpen,
  CalendarDays,
} from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock.ts';
import { pressBtn } from '../../ui/press.ts';

function linkClass(isActive: boolean): string {
  const base =
    // tighten paddings and ensure no-wrap pills
    'flex items-center gap-1 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap';
  const state = isActive
    ? 'bg-[var(--theme-button)] text-[var(--theme-text-white)]'
    : 'text-[var(--theme-text)] hover:text-[var(--theme-textbox)] hover:bg-[var(--theme-button-hover)]';
  return pressBtn(`${base} ${state}`);
}

export default function Navbar(): React.ReactElement {
  const nav = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    function onClickOutside(e: MouseEvent | TouchEvent) {
      const node = menuRef.current;
      if (!node) return;
      const target = e.target as Node | null;

      if (target instanceof Element && target.closest('[data-nav-toggle]')) return;
      if (target && !node.contains(target)) setOpen(false);
    }

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('touchstart', onClickOutside, { passive: true });

    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('touchstart', onClickOutside);
    };
  }, [open]);

  useScrollLock(open);

  async function onLogout() {
    await logout();
    nav('/', { replace: true });
  }

  function closeMenu() {
    setOpen(false);
  }

  function brandPath(u: { role: string } | null | undefined): string {
    if (!u) return '/';
    if (u.role === 'admin') return '/admin';
    return '/';
  }

  return (
    <header className="sticky top-0 z-40 bg-[var(--theme-bg)]/80 backdrop-blur border-b border-[var(--theme-border)]">
      {/* widen container a bit and keep height comfy */}
      <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between">
        {/* Brand */}
        <NavLink
          to={brandPath(user)}
          className="text-2xl font-bold text-[var(--theme-accent)] whitespace-nowrap"
        >
          Friday Bible Study
        </NavLink>

        {/* Desktop nav (≥ 1280px) */}
        {/* keep everything on one line, allow horizontal scroll if viewport is just shy */}
        <nav className="hidden xl:flex items-center gap-2 flex-nowrap overflow-x-auto header-nav--no-scrollbar">
          {/* Public */}
          <NavLink to="/contact" className={({isActive}) => linkClass(isActive)}>
            <Mail className="w-4 h-4"/>
            Contact
          </NavLink>

          {!user && (
            <>
              <NavLink to="/login" className={({isActive}) => linkClass(isActive)}>
                <LogIn className="w-4 h-4"/>
                Sign in
              </NavLink>
              <NavLink to="/register" className={({isActive}) => linkClass(isActive)}>
                <UserPlus className="w-4 h-4"/>
                Create account
              </NavLink>
            </>
          )}

          {user && (
            <>
              {/* ── Admin routes ── */}
              {user.role === 'admin' && (
                <>
                  <NavLink to="/admin" end className={({isActive}) => linkClass(isActive)}>
                    <ShieldCheck className="w-4 h-4"/>
                    Admin
                  </NavLink>
                  <NavLink to="/admin/digest" className={({isActive}) => linkClass(isActive)}>
                    <Mail className="w-4 h-4"/>
                    Digest
                  </NavLink>
                  <NavLink to="/admin/roster" className={({isActive}) => linkClass(isActive)}>
                    <Users className="w-4 h-4"/>
                    Roster
                  </NavLink>
                  <NavLink to="/admin/photos" className={({isActive}) => linkClass(isActive)}>
                    <ImageIcon className="w-4 h-4"/>
                    Photos
                  </NavLink>
                  <NavLink to="/admin/events" className={({isActive}) => linkClass(isActive)}>
                    <CalendarDays className="w-4 h-4"/>
                    Events
                  </NavLink>

                  <button
                    onClick={onLogout}
                    className="ml-2 flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--theme-surface)] border border-[var(--theme-border)] hover:bg-[var(--theme-card-hover)] whitespace-nowrap"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-4 h-4"/>
                    Sign out
                  </button>
                </>
              )}

              {/* ── Friend routes ── */}
              {user.role !== 'admin' && (
                <>
                  {/* Contact already shown publicly to the left, avoid duplicate here */}

                  <NavLink to="/bible" className={({isActive}) => linkClass(isActive)}>
                    <BookOpen className="w-4 h-4"/>
                    Bible
                  </NavLink>

                  <NavLink to="/portal" className={({isActive}) => linkClass(isActive)}>
                    <HelpingHand className="w-4 h-4"/>
                    Prayers
                  </NavLink>

                  <NavLink to="/board/praises" className={({isActive}) => linkClass(isActive)}>
                    <Sparkles className="w-4 h-4"/>
                    Praises
                  </NavLink>

                  <NavLink to="/board/archive" className={({isActive}) => linkClass(isActive)}>
                    <Archive className="w-4 h-4"/>
                    Archived
                  </NavLink>

                  <NavLink to="/photos" className={({isActive}) => linkClass(isActive)}>
                    <ImageIcon className="w-4 h-4"/>
                    Photos
                  </NavLink>

                  <NavLink to="/profile" className={({isActive}) => linkClass(isActive)}>
                    <User className="w-4 h-4"/>
                    Profile
                  </NavLink>

                  <NavLink to="/events" className={({isActive}) => linkClass(isActive)}>
                    <CalendarDays className="w-4 h-4"/>
                    Events
                  </NavLink>

                  <NavLink to="/roster" className={({isActive}) => linkClass(isActive)}>
                    <Users className="w-4 h-4"/>
                    Roster
                  </NavLink>

                  <button
                    onClick={onLogout}
                    className="ml-2 flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--theme-surface)] border border-[var(--theme-border)] hover:bg-[var(--theme-card-hover)] whitespace-nowrap"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-4 h-4"/>
                    Sign out
                  </button>
                </>
              )}
            </>
          )}
        </nav>

        {/* ▼ Hamburger + dropdown wrapper (≤ 1279px) */}
        <div className="xl:hidden relative z-50" ref={menuRef}>
          <button
            type="button"
            data-nav-toggle
            onClick={(e) => { e.stopPropagation(); setOpen((was) => !was); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((was) => !was); }
            }}
            aria-label="Toggle menu"
            aria-expanded={open}
            aria-controls="mobileMenu"
            className="p-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-[var(--theme-card-hover)]"
          >
            <Menu className="w-5 h-5 text-[var(--theme-text)]" />
          </button>

          {open && (
            <div
              id="mobileMenu"
              className="absolute right-0 mt-2 w-[min(90vw,20rem)] z-40
                 border border-[var(--theme-border)]
                 bg-[var(--theme-surface)] rounded-xl shadow-md
                 px-3 py-3 space-y-2"
            >
              <NavLink to="/contact" className={({ isActive }) => linkClass(isActive)} onClick={closeMenu}>
                <Mail className="w-4 h-4" />
                Contact
              </NavLink>

              {!user ? (
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
              ) : (
                <>
                  {/* ── Admin (mobile) ── */}
                  {user.role === 'admin' && (
                    <>
                      <NavLink to="/admin" end className={({ isActive }) => linkClass(isActive)} onClick={closeMenu}>
                        <ShieldCheck className="w-4 h-4" />
                        Admin
                      </NavLink>
                      <NavLink to="/admin/digest" className={({ isActive }) => linkClass(isActive)} onClick={closeMenu}>
                        <Mail className="w-4 h-4" />
                        Digest
                      </NavLink>
                      <NavLink to="/admin/roster" className={({ isActive }) => linkClass(isActive)} onClick={closeMenu}>
                        <Users className="w-4 h-4" />
                        Roster
                      </NavLink>
                      <NavLink to="/admin/photos" className={({ isActive }) => linkClass(isActive)} onClick={closeMenu}>
                        <ImageIcon className="w-4 h-4" />
                        Photos
                      </NavLink>
                      <NavLink to="/admin/events" className={({ isActive }) => linkClass(isActive)} onClick={closeMenu}>
                        <CalendarDays className="w-4 h-4" />
                        Events
                      </NavLink>

                      <button
                        onClick={() => { closeMenu(); void onLogout(); }}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--theme-surface)] border border-[var(--theme-border)] hover:bg-[var(--theme-card-hover)]"
                        aria-label="Sign out"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </>
                  )}

                  {/* ── Friend (mobile) ── */}
                  {user.role !== 'admin' && (
                    <>
                      <NavLink to="/bible" className={({ isActive }) => linkClass(isActive)} onClick={closeMenu}>
                        <BookOpen className="w-4 h-4" />
                        Bible
                      </NavLink>

                      <NavLink to="/portal" className={({ isActive }) => linkClass(isActive)} onClick={closeMenu}>
                        <HelpingHand className="w-4 h-4" />
                        Prayers
                      </NavLink>

                      <NavLink to="/board/praises" className={({ isActive }) => linkClass(isActive)} onClick={closeMenu}>
                        <Sparkles className="w-4 h-4" />
                        Praises
                      </NavLink>

                      <NavLink to="/board/archive" className={({ isActive }) => linkClass(isActive)} onClick={closeMenu}>
                        <Archive className="w-4 h-4" />
                        Archived
                      </NavLink>

                      <NavLink to="/photos" className={({ isActive }) => linkClass(isActive)} onClick={closeMenu}>
                        <ImageIcon className="w-4 h-4" />
                        Photos
                      </NavLink>

                      <NavLink to="/profile" className={({ isActive }) => linkClass(isActive)} onClick={closeMenu}>
                        <User className="w-4 h-4" />
                        Profile
                      </NavLink>

                      <NavLink to="/events" className={({ isActive }) => linkClass(isActive)} onClick={closeMenu}>
                        <CalendarDays className="w-4 h-4" />
                        Events
                      </NavLink>

                      <NavLink to="/roster" className={({ isActive }) => linkClass(isActive)} onClick={closeMenu}>
                        <Users className="w-4 h-4" />
                        Roster
                      </NavLink>

                      <button
                        onClick={() => { closeMenu(); void onLogout(); }}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--theme-surface)] border border-[var(--theme-border)] hover:bg-[var(--theme-card-hover)]"
                        aria-label="Sign out"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Click-through backdrop behind dropdown (mobile only) */}
      {open && (
        <button
          className="xl:hidden fixed inset-0 z-30 bg-transparent"
          aria-label="Close menu"
          onClick={closeMenu}
        />
      )}
    </header>
  );
}
