// Client/src/routes/admin/AdminRoutes.tsx
import type { RouteObject } from 'react-router-dom';
import AdminLayout from '../../pages/admin/AdminLayout';
import AdminPrayersPage from '../../pages/admin/AdminPrayersPage';
import AdminPrayerDetailPage from '../../pages/admin/AdminPrayerDetailPage';
import AdminRosterPage from '../../pages/admin/AdminRosterPage';
import AdminDigestPage from '../../pages/admin/AdminDigestPage';
import { AdminGuard } from '../../common/admin/AdminAuthGuard.tsx';

const adminRoutes: RouteObject[] = [
  {
    path: '/admin',
    element: (
      <AdminGuard>
        <AdminLayout />
      </AdminGuard>
    ),
    children: [
      { index: true, element: <AdminPrayersPage /> },
      { path: 'prayers/:id', element: <AdminPrayerDetailPage /> },
      { path: 'roster', element: <AdminRosterPage /> },   // ✅ new
      { path: 'digest', element: <AdminDigestPage /> },   // ✅ new
    ],
  },
];

export default adminRoutes;
