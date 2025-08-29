import React from 'react';
import AppRoutes from './AppRoutes';
import { Toaster } from 'react-hot-toast';
import Navbar from "./components/nav/Navbar.tsx";
import Footer from "./common/Footer.tsx";

export default function App(): React.ReactElement {
  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto p-3">
        <AppRoutes />
      </main>
      <Footer />
      <Toaster position="top-center" />
    </>
  );
}
