import type { RouteObject } from 'react-router-dom';
import { FriendGuard } from '../../common/friend/FriendAuthGuard';
import FriendLayout from '../../pages/layout/FriendLayout.tsx';
import PrayersPortalPage from '../../pages/portal/PortalPageStub.tsx';
import PraisesBoardPage from '../../pages/board/PraisesBoardPageLogic.tsx';
import ArchiveBoardPage from '../../pages/board/ArchivedBoardPageLogic.tsx';
import ProfilePage from '../../pages/profile/ProfileAccountLogic.tsx';
import PhotosPageLogic from '../../pages/photos/PhotosPageLogic.tsx';
import BiblePageLogic from "../../pages/bible/BiblePageLogic.tsx";
import EventsPageLogic from '../../pages/events/EventsPageLogic.tsx';
import RosterPageLogic from '../../pages/roster/RosterPageLogic.tsx';

const friendRoutes: RouteObject[] = [
  {
    path: '/',
    element: (
      <FriendGuard>
        <FriendLayout />
      </FriendGuard>
    ),
    children: [
      { path: 'portal', element: <PrayersPortalPage /> },
      { path: 'board/praises', element: <PraisesBoardPage /> },
      { path: 'board/archive', element: <ArchiveBoardPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'photos', element: <PhotosPageLogic /> },
      { path: 'bible', element: <BiblePageLogic /> },
      { path: 'events', element: <EventsPageLogic /> },
      { path: 'roster', element: <RosterPageLogic /> },
    ],
  },
];

export default friendRoutes;
