// Client/src/AppRoutes.tsx
import React, { useEffect } from 'react';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage.tsx';
import Register from './pages/auth/Register.auth';
import Login from './pages/auth/Login.auth';

import ProfileAccount from './pages/account/Profile.account';
import ContactPage from './pages/contact/ContactPage';
import { useAuthStore } from './stores/auth.store';

// NEW: dedicated board pages
import ActiveBoard from './pages/board/ActiveBoard.page';
import ArchiveBoard from './pages/board/ArchiveBoard.page';
import PraisesBoard from './pages/board/PraisesBoard.page';

function RequireAuth({ children }: Readonly<{ children: React.ReactElement }>): React.ReactElement {
  const { user, me } = useAuthStore();
  const loc = useLocation();

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
      <Route path="/contact" element={<ContactPage />} />

      {/* Default portal = Active Praises (single column) */}
      {/* If PortalBoard re-exports ActiveBoard, either of these lines works.
          To be explicit, we'll render ActiveBoard directly. */}
      <Route path="/portal" element={<RequireAuth><ActiveBoard /></RequireAuth>} />

      {/* Explicit board routes */}
      <Route path="/board/active" element={<RequireAuth><ActiveBoard /></RequireAuth>} />
      <Route path="/board/archive" element={<RequireAuth><ArchiveBoard /></RequireAuth>} />
      <Route path="/board/praises" element={<RequireAuth><PraisesBoard /></RequireAuth>} />

      <Route path="/profile" element={<RequireAuth><ProfileAccount /></RequireAuth>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/portal" replace />} />
    </Routes>
  );
}
