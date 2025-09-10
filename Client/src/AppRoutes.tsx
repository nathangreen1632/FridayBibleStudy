// Client/src/AppRoutes.tsx
import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';

import HomePage from './pages/HomePage.tsx';
import Register from './pages/RegisterPage.tsx';
import Login from './pages/LoginPage.tsx';
import ContactPageWrapper from './pages/contact/ContactPageWrapper.tsx';

// Forgot Password
import RequestReset from './pages/RequestReset.tsx';
import ResetPassword from './pages/ResetPassword.tsx';

// Route groups
import adminRoutes from './routes/admin/AdminRoutes';
import friendRoutes from './routes/friend/FriendRoutes';

export default function AppRoutes(): React.ReactElement {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/contact" element={<ContactPageWrapper />} />

      {/* Forgot Password */}
      <Route path="/request-reset" element={<RequestReset />} />
      <Route path="/reset-password" element={<ResetPassword />} />

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
