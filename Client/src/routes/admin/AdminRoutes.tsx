// Client/src/routes/admin/AdminRoutes.tsx
import type { RouteObject } from 'react-router-dom';
import AdminLayout from '../../pages/admin/AdminLayout';
import AdminPrayersPage from '../../pages/admin/AdminPrayersPage';
import AdminPrayerDetailPage from '../../pages/admin/AdminPrayerDetailPage';
import { AdminGuard } from '../../common/admin/AuthGuard';

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
    ],
  },
];

export default adminRoutes;
