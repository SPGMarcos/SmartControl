// src/components/Layout.jsx
import React from 'react';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="gradient-purple w-full h-[300px] absolute top-0 -z-10 opacity-50" />
      <main className="container mx-auto px-4 py-8 relative">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;