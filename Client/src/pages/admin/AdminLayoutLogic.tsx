import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminLayoutView from '../../jsx/admin/adminLayoutView';

export default function AdminLayoutLogic(): React.ReactElement {
  return (
    <AdminLayoutView>
      <Outlet />
    </AdminLayoutView>
  );
}
