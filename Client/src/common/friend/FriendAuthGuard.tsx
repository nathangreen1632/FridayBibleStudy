import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';

/**
 * Restricts access to authenticated non-admin (member) routes.
 * - If not logged in → go to /login (preserve "from" for redirect-back)
 * - If admin → redirect to /admin
 * - Else render children
 */
export function FriendGuard({ children }: Readonly<{ children: React.ReactElement }>) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  // Not logged in → send to login (keep return URL)
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admins should use the admin surface
  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // Authorized member
  return children;
}
