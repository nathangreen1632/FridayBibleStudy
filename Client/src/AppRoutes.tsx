// Client/src/AppRoutes.tsx
import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';

import HomePageWrapper from './pages/home/HomePageWrapper.tsx';
import Register from './pages/auth/RegisterPageLogic.tsx';
import Login from './pages/auth/LoginPageLogic.tsx';
import ContactFormWrapper from './pages/contact/ContactFormWrapper.tsx';

// Forgot Password
import RequestResetPageLogic from './pages/auth/RequestResetPageLogic.tsx';
import ResetPasswordPageLogic from './pages/auth/ResetPasswordPageLogic.tsx';

// Route groups
import adminRoutes from './routes/admin/AdminRoutes';
import friendRoutes from './routes/friend/FriendRoutes';

export default function AppRoutes(): React.ReactElement {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePageWrapper />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/contact" element={<ContactFormWrapper />} />

      {/* Forgot Password */}
      <Route path="/request-reset" element={<RequestResetPageLogic />} />
      <Route path="/reset-password" element={<ResetPasswordPageLogic />} />

      {/* Member (Friend) Routes */}
      {friendRoutes.map((route) => (
        <Route key={route.path || 'friend-root'} path={route.path} element={route.element}>
          {route.children?.map((child) => (
            <Route
              key={child.path || 'index'}
              index={child.index}
              path={child.path}
              element={child.element}
            />
          ))}
        </Route>
      ))}

      {/* Admin Portal Routes */}
      {adminRoutes.map((route) => (
        <Route key={route.path || 'admin-root'} path={route.path} element={route.element}>
          {route.children?.map((child) => (
            <Route
              key={child.path || 'index'}
              index={child.index}
              path={child.path}
              element={child.element}
            />
          ))}
        </Route>
      ))}

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/portal" replace />} />
    </Routes>
  );
}
