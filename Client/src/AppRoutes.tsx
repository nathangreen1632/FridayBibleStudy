// Client/src/AppRoutes.tsx
import React, { useEffect } from 'react';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage.tsx';
import Register from './pages/RegisterPage.tsx';
import Login from './pages/LoginPage.tsx';

import AccountPage from './pages/AccountPage.tsx';
import ContactPageWrapper from './pages/contact/ContactPageWrapper.tsx';
import { useAuthStore } from './stores/useAuthStore.ts';

// NEW: dedicated board pages
import ActiveBoard from './pages/board/ActiveBoardPage.tsx';
import ArchiveBoard from './pages/board/ArchiveBoardPage.tsx';
import PraisesBoard from './pages/board/PraisesBoardPage.tsx';

// NEW: Forgot Password pages
import RequestReset from './pages/RequestReset.tsx';
import ResetPassword from './pages/ResetPassword.tsx';

function RequireAuth({ children }: Readonly<{ children: React.ReactElement }>): React.ReactElement {
  const { user, me } = useAuthStore();
  const loc = useLocation();

  useEffect(() => {
    if (!user) {
      (async () => {
        try {
          await me();
        } catch {
          // swallow errors (or add logging)
        }
      })();
    }
  }, [user, me]);


  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}

export default function AppRoutes(): React.ReactElement {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/contact" element={<ContactPageWrapper />} />

      {/* Forgot Password */}
      <Route path="/request-reset" element={<RequestReset />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Default portal = Active Praises (single column) */}
      {/* If PortalBoard re-exports ActiveBoard, either of these lines works.
          To be explicit, we'll render ActiveBoard directly. */}
      <Route path="/portal" element={<RequireAuth><ActiveBoard /></RequireAuth>} />

      {/* Explicit board routes */}
      <Route path="/board/active" element={<RequireAuth><ActiveBoard /></RequireAuth>} />
      <Route path="/board/archive" element={<RequireAuth><ArchiveBoard /></RequireAuth>} />
      <Route path="/board/praises" element={<RequireAuth><PraisesBoard /></RequireAuth>} />

      <Route path="/profile" element={<RequireAuth><AccountPage /></RequireAuth>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/portal" replace />} />
    </Routes>
  );
}
