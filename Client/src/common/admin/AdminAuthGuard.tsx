// Client/src/common/admin/AuthGuard.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';

/**
 * Restricts access to admin-only routes.
 * Wraps children in a guard; redirects to "/" if not authorized.
 */
export function AdminGuard({ children }: Readonly<{ children: React.ReactElement }>) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  // Not logged in → send to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but not admin → send home
  if (user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Authorized
  return children;
}
