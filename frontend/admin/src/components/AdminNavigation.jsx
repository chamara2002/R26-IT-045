import React, { useState } from 'react';
import clsx from 'clsx';
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  Megaphone,
  Activity,
  Settings,
  LogOut,
  ChevronDown,
  Home,
  Sun,
  Moon,
  UserCheck,
  Stethoscope,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useTheme } from '../../../src/context/ThemeContext';
import LanguageSwitcher from '../../../src/components/LanguageSwitcher';
import CsLogo from '../../../src/assets/cs-logo.png';

export const ADMIN_MENU_ITEMS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/admin',
  },
  {
    key: 'users',
    label: 'Farmers & Accounts',
    icon: Users,
    href: '/admin/users',
  },
  {
    key: 'admins',
    label: 'Admin Team',
    icon: UserCheck,
    href: '/admin/admins',
  },
  {
    key: 'ads',
    label: 'Advertisements',
    icon: Megaphone,
    href: '/admin/ads',
  },
  {
    key: 'logs',
    label: 'Diagnostic Logs',
    icon: Activity,
    href: '/admin/logs',
  },
  {
    key: 'settings',
    label: 'System Settings',
    icon: Settings,
    href: '/admin/settings',
  },
];

export function AdminSidebar({ isOpen, onClose, onLogout, admin }) {
  const location = useLocation();

  const isActive = (href) =>
    href === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(href);

  return (
    <div className="flex flex-col h-full w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="h-16 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <img src={CsLogo} alt="CattleSense" className="h-9 w-9 object-contain shrink-0" />
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                CattleSense
              </h1>
              <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                Admin
              </span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-medium mt-0.5">
              Control Console
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg lg:hidden"
        >
          <X className="h-5 w-5 text-slate-500" />
        </button>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        <div>
          <div className="flex items-center gap-2 px-3 mb-2">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Admin Management
            </p>
          </div>

          <div className="space-y-1">
            {ADMIN_MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.key}
                  to={item.href}
                  onClick={onClose}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 font-semibold text-sm',
                    active
                      ? 'bg-emerald-600 text-white shadow-sm dark:bg-emerald-500'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <Icon className={clsx('h-4 w-4 flex-shrink-0', active ? 'text-white' : 'text-slate-500 dark:text-slate-400')} />
                  <span className="flex-1">{item.label}</span>
                  {active && <ChevronRight className="h-3.5 w-3.5 opacity-80" />}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Farmer portal shortcuts */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 px-3 mb-2">
            <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Farmer Workspace
            </p>
          </div>

          <div className="space-y-1">
            <Link
              to="/"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Home className="h-4 w-4" />
              <span>Public Landing Page</span>
            </Link>
            <Link
              to="/modules"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              <Activity className="h-4 w-4" />
              <span>Disease Health Checks</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Admin User Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
              {admin?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {admin?.name || 'Administrator'}
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                Admin
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminTopNavbar({ onMenuClick, admin, isDark, onLogout }) {
  const location = useLocation();
  const { toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);

  const getPageTitle = () => {
    if (location.pathname === '/admin') return 'Admin Overview';
    if (location.pathname.startsWith('/admin/users')) return 'Farmers & Accounts';
    if (location.pathname.startsWith('/admin/admins')) return 'Admin Team';
    if (location.pathname.startsWith('/admin/ads')) return 'Advertisements';
    if (location.pathname.startsWith('/admin/logs')) return 'Diagnostic Logs';
    if (location.pathname.startsWith('/admin/settings')) return 'System Settings';
    if (location.pathname.startsWith('/admin/profile')) return 'Admin Profile';
    return 'Admin Panel';
  };

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex-shrink-0">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between">
        {/* Left: Mobile Menu + Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg lg:hidden"
          >
            <Menu className="h-6 w-6 text-slate-700 dark:text-slate-300" />
          </button>

          <Link to="/admin" className="flex items-center gap-2.5 lg:hidden">
            <img src={CsLogo} alt="CattleSense" className="h-9 w-9 object-contain shrink-0" />
            <span className="text-base font-bold text-slate-900 dark:text-white">CattleSense</span>
          </Link>

          <div className="hidden lg:flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {getPageTitle()}
            </h2>
          </div>
        </div>

        {/* Right: Theme Toggle, Language Switcher, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-700 dark:text-slate-300"
            title="Toggle theme"
          >
            {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>

          <LanguageSwitcher />

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center h-10 gap-2 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {admin?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <ChevronDown className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 mt-2 w-52 z-20 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Admin Account</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {admin?.email || 'admin@cattlesense.com'}
                    </p>
                  </div>
                  <div className="p-2 space-y-1">
                    <Link
                      to="/admin/profile"
                      onClick={() => setProfileOpen(false)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      <Settings className="h-4 w-4" />
                      Admin Profile
                    </Link>
                    <button
                      onClick={() => { setProfileOpen(false); onLogout?.(); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
