import React from 'react';
import { Outlet } from 'react-router-dom';

export default function FriendLayout(): React.ReactElement {
  return (
    <div className="py-6">
      <section>
        <Outlet />
      </section>
    </div>
  );
}
