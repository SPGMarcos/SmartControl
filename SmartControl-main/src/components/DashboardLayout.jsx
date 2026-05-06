import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import ThemeToggle from '@/components/ThemeToggle';
import {
  Home,
  LayoutDashboard,
  Zap,
  Settings,
  LogOut,
  Menu,
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

  const primaryItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Zap, label: 'Dispositivos', path: '/devices' },
    { icon: Layers, label: 'Projetos', path: '/dashboard', hash: '#projects' },
    { icon: ShoppingBag, label: 'Loja', path: '/shop' },
  ];

  const settingsItem = { icon: Settings, label: 'Configuracoes', path: '/settings' };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const toggleSidebar = () => setIsSidebarOpen((current) => !current);

  const closeSidebarOnMobile = () => {
    if (window.matchMedia('(max-width: 1023px)').matches) setIsSidebarOpen(false);
  };

  const isActiveItem = (item) => {
    if (item.path === '/') return location.pathname === '/';
    if (item.hash) return location.pathname === item.path && location.hash === item.hash;
    if (item.path === '/dashboard') return location.pathname === '/dashboard' && !location.hash;
    return location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
  };

  const navTarget = (item) => (item.hash ? `${item.path}${item.hash}` : item.path);

  const mobileItemClass = (item) =>
    `mobile-nav-item ${isActiveItem(item) ? 'active' : ''}`;

  const renderSidebarItem = (item) => {
    const isActive = isActiveItem(item);
    return (
      <Link
        key={item.label}
        to={navTarget(item)}
        onClick={closeSidebarOnMobile}
        title={!isSidebarOpen ? item.label : undefined}
        className={`sidebar-item ${isActive ? 'active' : ''}`}
      >
        <item.icon className="sidebar-icon" />
        <span className="sidebar-text">{item.label}</span>
      </Link>
    );
  };

  const displayName = getUserDisplayName(user);
  const userInitial = displayName?.trim()?.charAt(0)?.toUpperCase() || 'S';

  return (
    <div className={`dashboard-shell mobile-wrap ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <button
        type="button"
        aria-label={isSidebarOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
        onClick={toggleSidebar}
        className="app-menu-toggle"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'collapsed'}`} aria-label="Menu principal">
        <div className="sidebar-top">
          <Link to="/" className="logo" onClick={closeSidebarOnMobile}>
            <span>Smart</span>
            <span className="logo-accent">Control</span>
          </Link>
        </div>

        <div className="sidebar-middle">
          <nav className="sidebar-menu">
            {primaryItems.map(renderSidebarItem)}
          </nav>
        </div>

        <div className="sidebar-bottom">
          {renderSidebarItem(settingsItem)}
          <div className="sidebar-user" title={displayName}>
            <span className="sidebar-avatar">{userInitial}</span>
            <span className="sidebar-user-copy">
              <span className="sidebar-user-name">{displayName}</span>
              <span className="sidebar-user-meta">Conta SmartControl</span>
            </span>
          </div>
          <button type="button" onClick={handleLogout} className="sidebar-item sidebar-logout" title="Sair">
            <LogOut className="sidebar-icon" />
            <span className="sidebar-text">Sair</span>
          </button>
        </div>
      </aside>

      <div className="dashboard-content">
        <header className="dashboard-header">
          <ThemeToggle />
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

      <nav className="mobile-nav lg:hidden" aria-label="Navegacao principal mobile">
        <div className="mobile-nav-inner">
          <Link to="/" className={mobileItemClass(primaryItems[0])}>
            <Home className="h-5 w-5" />
            Home
          </Link>
          <Link to="/dashboard" className={mobileItemClass(primaryItems[1])}>
            <LayoutDashboard className="h-5 w-5" />
            Painel
          </Link>
          <Link to="/devices" className={mobileItemClass(primaryItems[2])}>
            <Zap className="h-5 w-5" />
            Dispositivos
          </Link>
          <Link to="/shop" className={mobileItemClass(primaryItems[4])}>
            <ShoppingBag className="h-5 w-5" />
            Loja
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default DashboardLayout;
