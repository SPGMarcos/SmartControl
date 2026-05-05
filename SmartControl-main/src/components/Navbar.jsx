import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import MarketplaceModal from '@/components/MarketplaceModal';
import ThemeToggle from '@/components/ThemeToggle';
import logo from '../assets/logo.png';

const Navbar = () => {
  const { user } = useAuth();

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-b border-purple-500/30"
    >

      <div className="container mx-auto flex h-16 flex-wrap items-center justify-between gap-3 px-3 sm:px-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="SmartControl" className="h-8 w-auto object-contain" />
            <span className="text-xl font-bold text-foreground hidden sm:inline">SmartControl</span>
          </Link>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
            <MarketplaceModal />
            <ThemeToggle />
            {user ? (
              <Link to="/dashboard" className="shrink-0">
                <Button className="bg-purple-600 hover:bg-purple-700 whitespace-nowrap">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-gray-300 hover:text-white transition-colors whitespace-nowrap">
                  Login
                </Link>
                <Link to="/register" className="shrink-0">
                  <Button className="bg-purple-600 hover:bg-purple-700 whitespace-nowrap">
                    Cadastrar
                  </Button>
                </Link>
              </>
            )}
          </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
