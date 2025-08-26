import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Home from '../src/pages/Home';
import Register from './pages/auth/Register.auth';
import PortalBoard from './pages/portal/PortalBoard.portal';

export default function AppRoutes(): React.ReactElement {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/portal" element={<PortalBoard />} />
    </Routes>
  );
}
