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

  const mobileItemClass = (path) =>
    `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition ${
      location.pathname === path
        ? 'bg-purple-600 text-white'
        : 'text-gray-400 hover:bg-purple-600/20 hover:text-white'
    }`;

  const HEADER_HEIGHT = 64; // px
  const displayName = getUserDisplayName(user);

  return (
    <div className="flex min-h-screen bg-black">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-gray-900 to-black border-r border-purple-500/30 z-50 transform transition-transform duration-300 overflow-y-auto pb-8 ${
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
              aria-label={sidebarOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-10 w-auto gap-2 px-3 text-white lg:hidden"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              <span>Menu</span>
            </Button>
            <span className="hidden text-white font-bold text-xl sm:block">
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
        <main className="flex-1" style={{ paddingTop: HEADER_HEIGHT }}>
          <div className="min-h-[calc(100vh-64px)] px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-7xl mx-auto w-full"
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-purple-500/30 bg-black/95 px-2 py-2 shadow-2xl shadow-purple-950/40 backdrop-blur-lg lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-1">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium text-gray-400 transition hover:bg-purple-600/20 hover:text-white"
            aria-label="Abrir menu lateral"
          >
            <Menu className="h-5 w-5" />
            Menu
          </button>
          <Link to="/dashboard" className={mobileItemClass('/dashboard')}>
            <LayoutDashboard className="h-5 w-5" />
            Inicio
          </Link>
          <Link to="/devices" className={mobileItemClass('/devices')}>
            <Zap className="h-5 w-5" />
            Dispositivos
          </Link>
          <Link to="/add-device" className={mobileItemClass('/add-device')}>
            <Plus className="h-5 w-5" />
            Adicionar
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium text-gray-400 transition hover:bg-red-500/10 hover:text-white"
            aria-label="Sair da conta"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </nav>

      {/* Overlay para mobile quando a sidebar está aberta */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;
