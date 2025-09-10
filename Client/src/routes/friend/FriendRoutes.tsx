import type { RouteObject } from 'react-router-dom';
import { FriendGuard } from '../../common/friend/FriendAuthGuard';
import FriendLayout from '../../pages/friend/FriendLayout';

// ⚠️ Adjust these imports to your actual page components
import PrayersPortalPage from '../../pages/PortalPage';
import PraisesBoardPage from '../../pages/board/PraisesBoardPage';
import ArchiveBoardPage from '../../pages/board/ArchiveBoardPage';
import ProfilePage from '../../pages/AccountPage';

const friendRoutes: RouteObject[] = [
  {
    path: '/',
    element: (
      <FriendGuard>
        <FriendLayout />
      </FriendGuard>
    ),
    children: [
      // paths align with links in Navbar (non-admin)
      { path: 'portal', element: <PrayersPortalPage /> },
      { path: 'board/praises', element: <PraisesBoardPage /> },
      { path: 'board/archive', element: <ArchiveBoardPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
];

export default friendRoutes;
