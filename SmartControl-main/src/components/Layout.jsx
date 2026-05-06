// src/components/Layout.jsx
import React from 'react';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';

const Layout = ({ children }) => {
  return (
    <div className="mobile-wrap min-h-screen overflow-x-hidden bg-background text-foreground">
      <Navbar />
      <div className="gradient-purple w-full h-[300px] absolute top-0 -z-10 opacity-50" />
      <main className="container relative mx-auto w-full max-w-full px-3 py-6 sm:px-4 sm:py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
