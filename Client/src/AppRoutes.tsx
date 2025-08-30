import React, { useEffect } from 'react';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage.tsx';
import Register from './pages/auth/Register.auth';
import Login from './pages/auth/Login.auth';
import PortalBoard from './pages/portal/PortalBoard.portal';
import ProfileAccount from './pages/account/Profile.account';
import { useAuthStore } from './stores/auth.store';

function RequireAuth({ children }: Readonly<{ children: React.ReactElement }>): React.ReactElement {
  const { user, me } = useAuthStore();
  const loc = useLocation();

  // try hydrate session once on entry
  useEffect(() => { if (!user) void me(); }, [user, me]);

  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}

export default function AppRoutes(): React.ReactElement {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />

      <Route path="/portal" element={<RequireAuth><PortalBoard /></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth><ProfileAccount /></RequireAuth>} />

      <Route path="*" element={<Navigate to="/portal" replace />} />
    </Routes>
  );
}
