import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import logo from '../assets/logo.png';

const Navbar = () => {
  const { user } = useAuth();

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-b border-purple-500/30"
    >

      <div className="container mx-auto px-4 py-4">
        <div className="container mx-auto px-4 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="SmartControl" className="h-8 w-auto object-contain" />
            <span className="text-xl font-bold text-foreground hidden sm:inline">SmartControl</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link to="/shop" className="text-gray-300 hover:text-white transition-colors">
              Loja
            </Link>
            {user ? (
              <Link to="/dashboard">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-gray-300 hover:text-white transition-colors">
                  Login
                </Link>
                <Link to="/register">
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    Cadastrar
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;