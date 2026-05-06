import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';
import {
  Home,
  LayoutDashboard,
  Zap,
  Plus,
  Settings,
  LogOut,
  Menu,
  Shield,
  ShoppingBag,
  Layers,
} from 'lucide-react';
import { getUserDisplayName } from '@/lib/deviceProjects';

const DashboardLayout = ({ children }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    if (mediaQuery.matches) setIsSidebarOpen(false);
  }, []);

  const menuGroups = [
    {
      heading: 'Navegacao',
      items: [
        { icon: Home, label: 'Home', path: '/' },
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Layers, label: 'Projetos', path: '/dashboard' },
        { icon: ShoppingBag, label: 'Loja', path: '/shop' },
      ],
    },
    {
      heading: 'Gerenciamento',
      items: [
        { icon: Zap, label: 'Dispositivos', path: '/devices' },
        { icon: Plus, label: 'Adicionar', path: '/add-device' },
        { icon: Settings, label: 'Configuracoes', path: '/settings' },
      ],
    },
  ];

  const userRole = user?.app_metadata?.role || user?.user_metadata?.role || user?.role;

  if (userRole === 'admin') {
    menuGroups[1].items.push({ icon: Shield, label: 'Admin', path: '/admin' });
  }

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const toggleSidebar = () => setIsSidebarOpen((current) => !current);

  const isActivePath = (path) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const mobileItemClass = (path) =>
    `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium leading-tight transition min-[380px]:px-2 min-[380px]:text-[11px] ${
      isActivePath(path)
        ? 'bg-purple-600 text-white'
        : 'text-gray-400 hover:bg-purple-600/20 hover:text-white'
    }`;

  const displayName = getUserDisplayName(user);

  return (
    <div className={`dashboard-shell mobile-wrap ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
      {isSidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Fechar menu lateral"
        />
      )}

      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-header">
          <Link
            to="/"
            className="logo"
            onClick={() => {
              if (window.matchMedia('(max-width: 1023px)').matches) setIsSidebarOpen(false);
            }}
          >
            <span>Smart</span>
            <span className="text-purple-400">Control</span>
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            className="sidebar-toggle"
            aria-label={isSidebarOpen ? 'Recolher menu lateral' : 'Abrir menu lateral'}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <nav className="sidebar-menu">
          {menuGroups.map((group) => (
            <div key={group.heading} className="sidebar-group">
              <p className="sidebar-heading">{group.heading}</p>
              {group.items.map((item) => {
                const isActive = isActivePath(item.path);
                return (
                  <Link
                    key={`${group.heading}-${item.label}`}
                    to={item.path}
                    onClick={() => {
                      if (window.matchMedia('(max-width: 1023px)').matches) setIsSidebarOpen(false);
                    }}
                    title={!isSidebarOpen ? item.label : undefined}
                    className={`sidebar-item ${isActive ? 'active' : ''}`}
                  >
                    <item.icon className="sidebar-icon" />
                    <span className="sidebar-text">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-account">
          <div className="sidebar-user">
            <p>{displayName}</p>
            <span>Conta SmartControl</span>
          </div>
          <button type="button" onClick={handleLogout} className="sidebar-item sidebar-logout" title="Sair">
            <LogOut className="sidebar-icon" />
            <span className="sidebar-text">Sair</span>
          </button>
        </div>
      </aside>

      <div className="dashboard-content">
        <header className="dashboard-header">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              aria-label={isSidebarOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
              onClick={toggleSidebar}
              className="h-10 w-auto shrink-0 gap-2 px-2 text-white min-[380px]:px-3"
            >
              <Menu className="h-5 w-5" />
              <span className="hidden min-[380px]:inline lg:hidden">Menu</span>
            </Button>
            <Link to="/" className="hidden truncate text-xl font-bold text-white transition hover:text-purple-200 sm:block">
              SmartControl
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-white">{displayName}</p>
              <p className="text-xs text-gray-500">Dashboard ativo</p>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="dashboard-main">
          <div className="min-h-[calc(100vh-64px)] max-w-full px-3 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mx-auto w-full max-w-7xl min-w-0"
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-30 max-w-full border-t border-purple-500/30 bg-black/95 px-1.5 py-2 shadow-2xl shadow-purple-950/40 backdrop-blur-lg lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-0.5 min-[380px]:gap-1">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium leading-tight text-gray-400 transition hover:bg-purple-600/20 hover:text-white min-[380px]:px-2 min-[380px]:text-[11px]"
            aria-label="Abrir menu lateral"
          >
            <Menu className="h-5 w-5" />
            Menu
          </button>
          <Link to="/" className={mobileItemClass('/')}>
            <Home className="h-5 w-5" />
            Home
          </Link>
          <Link to="/dashboard" className={mobileItemClass('/dashboard')}>
            <LayoutDashboard className="h-5 w-5" />
            Painel
          </Link>
          <Link to="/devices" className={mobileItemClass('/devices')}>
            <Zap className="h-5 w-5" />
            Dispositivos
          </Link>
          <Link to="/shop" className={mobileItemClass('/shop')}>
            <ShoppingBag className="h-5 w-5" />
            Loja
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default DashboardLayout;
