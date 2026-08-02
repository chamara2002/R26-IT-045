import { useState } from 'react';
import clsx from 'clsx';
import {
  Menu,
  X,
  LayoutDashboard,
  Droplets,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
  Home,
  Bug,
  ShieldCheck,
  HelpCircle,
  Info,
  Sun,
  Moon,
  Shield,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n/language-context';
import CsLogo from '../assets/cs-logo.png';

export function Sidebar({ isOpen, onClose, onLogout, user }) {
  const location = useLocation();
  const { isDark } = useTheme();

  const { t } = useI18n();

  const menuItems = [
    { icon: LayoutDashboard, label: t('header.nav.dashboard'), href: '/dashboard', badge: null },
    { icon: ShieldCheck, label: t('header.nav.cows'), href: '/cows', badge: null },
    { icon: Droplets, label: 'Milk Logs', href: '/milk', badge: null },
    { icon: FileText, label: 'Modules', href: '/modules', badge: null },
    { icon: HelpCircle, label: t('guidance.title') || 'Guidance', href: '/guidance', badge: null },
  ];

  const isActive = (href) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

  return (
    <div className="flex flex-col h-full w-64 bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center">
              <img src={CsLogo} alt="CattleSense" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                CattleSense
              </h1>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => onClose()}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium',
                active
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-2">
        {user?.role === 'admin' && (
          <Link
            to="/admin"
            onClick={() => onClose()}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors font-medium"
          >
            <Shield className="h-5 w-5" />
            <span>Admin Panel</span>
          </Link>
        )}
        <Link
          to="/profile"
          onClick={() => onClose()}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"
        >
          <Settings className="h-5 w-5" />
          <span>Profile Settings</span>
        </Link>
        <button
          onClick={() => {
            onClose();
            onLogout();
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
        {user && (
          <div className="pt-2 px-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {user.email}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function TopNavbar({ onMenuClick, user, isDark, onThemeToggle, onLogout }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const { toggleTheme } = useTheme();
  const location = useLocation();
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 backdrop-blur-md bg-opacity-95 dark:bg-opacity-95">
      <div className="px-4 py-3 sm:px-6 flex items-center justify-between">
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg lg:hidden"
        >
          <Menu className="h-6 w-6 text-slate-700 dark:text-slate-300" />
        </button>

        <div className="hidden lg:flex items-center gap-4 flex-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {(() => {
              const path = location.pathname;
              if (path.startsWith('/cows')) return t('header.nav.cows');
              if (path.startsWith('/milk')) return t('dashboard.recentMilkLogs') || 'Milk Logs';
              if (path.startsWith('/modules') || path.startsWith('/detect')) return t('modules.title');
              return t('header.nav.dashboard');
            })()}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Home Page button */}
          <Link
            to="/"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Home Page"
          >
            <Home className="h-5 w-5 text-slate-700 dark:text-slate-300" />
          </Link>

          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Toggle theme"
          >
            {isDark ? (
              <Moon className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            ) : (
              <Sun className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold">
                {user?.email?.[0]?.toUpperCase() || 'F'}
              </div>
              <ChevronDown className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {user?.email}
                  </p>
                </div>
                <div className="p-2 space-y-1">
                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setProfileOpen(false)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                    >
                      <Shield className="h-4 w-4" />
                      Admin Panel
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    <Settings className="h-4 w-4" />
                    Profile Settings
                  </Link>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      onLogout?.();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
