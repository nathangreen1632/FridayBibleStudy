import type { RouteObject } from 'react-router-dom';
import AdminLayout from '../../pages/admin/AdminLayoutLogic.tsx';
import AdminPrayersPage from '../../pages/admin/AdminPrayersPageLogic.tsx';
import AdminPrayerDetailPage from '../../pages/admin/AdminPrayerDetailPageLogic.tsx';
import AdminRosterPage from '../../pages/admin/AdminRosterPageLogic.tsx';
import AdminDigestPage from '../../pages/admin/AdminDigestPageLogic.tsx';
import PhotosPageLogic from '../../pages/photos/PhotosPageLogic.tsx';
import EventsPageLogic from '../../pages/events/EventsPageLogic.tsx'; // ⬅️ add this
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
      { path: 'roster', element: <AdminRosterPage /> },
      { path: 'digest', element: <AdminDigestPage /> },
      { path: 'photos', element: <PhotosPageLogic /> },
      { path: 'events', element: <EventsPageLogic /> }, // ⬅️ new
    ],
  },
];

export default adminRoutes;
