import type { RouteObject } from 'react-router-dom';
import { FriendGuard } from '../../common/friend/FriendAuthGuard';
import FriendLayout from '../../pages/friend/FriendLayout';
import PrayersPortalPage from '../../pages/PortalPage';
import PraisesBoardPage from '../../pages/board/PraisesBoardPage';
import ArchiveBoardPage from '../../pages/board/ArchiveBoardPage';
import ProfilePage from '../../pages/AccountPage';
import PhotosPage from '../../pages/PhotosPage';
import BiblePage from "../../pages/BiblePage.tsx";
import EventsPage from '../../pages/EventsPage.tsx';
import RosterPage from '../../pages/RosterPage.tsx';

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
      { path: 'photos', element: <PhotosPage /> },
      { path: 'bible', element: <BiblePage /> },
      { path: 'events', element: <EventsPage /> },
      { path: 'roster', element: <RosterPage /> },
    ],
  },
];

export default friendRoutes;
