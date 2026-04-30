import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';
import {
  LayoutDashboard,
  Zap,
  Plus,
  Settings,
  LogOut,
  Menu,
  X,
  Shield
} from 'lucide-react';
import { getUserDisplayName } from '@/lib/deviceProjects';

const DashboardLayout = ({ children }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Zap, label: 'Dispositivos', path: '/devices' },
    { icon: Plus, label: 'Adicionar', path: '/add-device' },
    { icon: Settings, label: 'Configurações', path: '/settings' },
  ];

  if (user?.role === 'admin') {
    menuItems.push({ icon: Shield, label: 'Admin', path: '/admin' });
  }

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const HEADER_HEIGHT = 64; // px
  const displayName = getUserDisplayName(user);

  return (
    <div className="flex min-h-screen bg-black">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-gray-900 to-black border-r border-purple-500/30 z-40 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        style={{ paddingTop: HEADER_HEIGHT }}
      >
        <div className="p-6 pt-10">
          <h1 className="text-2xl font-bold text-white mb-10 mt-2">
            Smart<span className="text-purple-400">Control</span>
          </h1>

          <nav className="space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:bg-purple-600/20 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-6 left-6 right-6">
            <div className="gradient-card p-4 rounded-lg border border-purple-500/30 mb-4">
              <p className="text-white font-medium">{displayName}</p>
              <p className="text-gray-400 text-sm">Conta SmartControl</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full border-purple-500/30 bg-black/30 text-gray-300 hover:bg-red-500/10 hover:text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Header */}
        <header
          className="fixed top-0 left-0 right-0 lg:left-64 bg-black/90 backdrop-blur-lg border-b border-purple-500/30 z-30 flex items-center justify-between px-4 sm:px-6"
          style={{ height: HEADER_HEIGHT }}
        >
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white lg:hidden"
            >
              {sidebarOpen ? <X /> : <Menu />}
            </Button>
            <span className="text-white font-bold text-xl hidden lg:block">
              SmartControl
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-white">{displayName}</p>
              <p className="text-xs text-gray-500">Dashboard ativo</p>
            </div>
            <ThemeToggle />
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="border-purple-500/30 bg-black/30 text-gray-300 hover:bg-red-500/10 hover:text-white"
            >
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8" style={{ paddingTop: HEADER_HEIGHT }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Overlay para mobile quando a sidebar está aberta */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;
