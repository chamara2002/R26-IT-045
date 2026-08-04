import { useState } from 'react';
import clsx from 'clsx';
import {
  Menu,
  X,
  LayoutDashboard,
  Droplets,
  Settings,
  LogOut,
  ChevronDown,
  Home,
  HelpCircle,
  Sun,
  Moon,
  Shield,
  HeartPulse,
  ShieldAlert,
  Syringe,
  Thermometer,
  Stethoscope,
  Beef,
  ChevronRight,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n/language-context';
import CsLogo from '../assets/cs-logo.png';
import LanguageSwitcher from './LanguageSwitcher';

// ─── Disease module definitions ──────────────────────────────────────────────
export const DISEASE_MODULES = [
  {
    key: 'mastitis',
    label: 'Mastitis',
    icon: HeartPulse,
    href: '/detect/mastitis',
    color: 'text-emerald-600 dark:text-emerald-400',
    activeBg: 'bg-emerald-50 dark:bg-emerald-900/30',
    dot: 'bg-emerald-500',
  },
  {
    key: 'fmd',
    label: 'FMD',
    icon: ShieldAlert,
    href: '/detect/fmd',
    color: 'text-orange-600 dark:text-orange-400',
    activeBg: 'bg-orange-50 dark:bg-orange-900/30',
    dot: 'bg-orange-500',
  },
  {
    key: 'lumpy',
    label: 'Lumpy Skin Disease',
    icon: Syringe,
    href: '/detect/lumpy',
    color: 'text-violet-600 dark:text-violet-400',
    activeBg: 'bg-violet-50 dark:bg-violet-900/30',
    dot: 'bg-violet-500',
  },
  {
    key: 'milk-fever',
    label: 'Milk Fever',
    icon: Thermometer,
    href: '/detect/milk-fever',
    color: 'text-teal-600 dark:text-teal-400',
    activeBg: 'bg-teal-50 dark:bg-teal-900/30',
    dot: 'bg-teal-500',
  },
];

export function Sidebar({ isOpen, onClose, onLogout, user }) {
  const location = useLocation();
  const { t } = useI18n();

  const moduleLabelKey = {
    mastitis: 'modules.mastitis',
    fmd: 'modules.fmd',
    lumpy: 'modules.lumpy',
    'milk-fever': 'modules.milkFever',
  };

  const farmItems = [
    { icon: LayoutDashboard, label: t('header.nav.dashboard') || 'Dashboard', href: '/dashboard' },
    { icon: Beef,             label: t('header.nav.cows') || 'My Cattle',  href: '/cows' },
    { icon: Droplets,        label: t('milk.title') || 'Milk Logs',  href: '/milk' },
    { icon: HelpCircle,      label: t('guidance.title') || 'Guidance',   href: '/guidance' },
  ];

  const isActive = (href) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

  return (
    <div className="flex flex-col h-full w-72 bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="h-16 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl overflow-hidden bg-white shadow-sm ring-1 ring-emerald-100 dark:ring-emerald-900/40 flex-shrink-0">
            <img src={CsLogo} alt="CattleSense" className="h-full w-full object-contain" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">
              CattleSense
            </h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-medium mt-0.5">
              {t('header.nav.detection') || 'Disease Detection'}
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

      <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
        {/* ── Disease Detection Group ─────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 px-3 mb-2">
            <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              {t('header.nav.detection') || 'Disease Detection'}
            </p>
          </div>

          {/* Hub link */}
          <Link
            to="/modules"
            onClick={onClose}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 font-semibold text-sm mb-1',
              isActive('/modules') && !DISEASE_MODULES.some(m => isActive(m.href))
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Stethoscope className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{t('modules.title') || 'Detection Hub'}</span>
            <ChevronRight className="h-3 w-3 opacity-50" />
          </Link>

          {/* Individual disease links */}
          <div className="space-y-0.5">
            {DISEASE_MODULES.map((mod) => {
              const Icon = mod.icon;
              const active = isActive(mod.href);
              const label = t(moduleLabelKey[mod.key]) || mod.label;
              return (
                <Link
                  key={mod.key}
                  to={mod.href}
                  onClick={onClose}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm',
                    active
                      ? `${mod.activeBg} ${mod.color} ring-1 ring-current ring-opacity-20`
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <div className={clsx('flex-shrink-0', active ? mod.color : 'text-slate-400 dark:text-slate-500')}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="flex-1 truncate">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 dark:border-slate-800" />

        {/* ── Farm Management Group ───────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 px-3 mb-2">
            <Beef className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              {t('landing.operations') || 'Farm Management'}
            </p>
          </div>
          <div className="space-y-0.5">
            {farmItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm',
                    active
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-3 space-y-1">
        {user?.role === 'admin' && (
          <Link
            to="/admin"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors font-medium text-sm"
          >
            <Shield className="h-4 w-4" />
            <span>Admin Panel</span>
          </Link>
        )}
        <Link
          to="/profile"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-sm"
        >
          <Settings className="h-4 w-4" />
          <span>{t('profile.title') || 'Profile Settings'}</span>
        </Link>
        <button
          onClick={() => { onClose(); onLogout(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium text-sm"
        >
          <LogOut className="h-4 w-4" />
          <span>{t('common.logout') || 'Logout'}</span>
        </button>
        {user && (
          <div className="pt-1 px-3">
            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{user.email}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function TopNavbar({ onMenuClick, user, isDark, onLogout }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const { toggleTheme } = useTheme();
  const location = useLocation();
  const { t } = useI18n();

  const moduleLabelKey = {
    mastitis: 'modules.mastitis',
    fmd: 'modules.fmd',
    lumpy: 'modules.lumpy',
    'milk-fever': 'modules.milkFever',
  };

  // Resolve current page name and accent colour for detect pages
  const detectMod = DISEASE_MODULES.find(m => location.pathname.startsWith(m.href));

  const pageTitle = (() => {
    if (detectMod) {
      const key = moduleLabelKey[detectMod.key];
      return t(key) || detectMod.label;
    }
    if (location.pathname.startsWith('/modules')) return t('modules.title') || 'Detection Hub';
    if (location.pathname.startsWith('/cows')) return t('header.nav.cows') || 'My Cattle';
    if (location.pathname.startsWith('/milk')) return t('milk.title') || 'Milk Logs';
    if (location.pathname.startsWith('/guidance')) return t('guidance.title') || 'Guidance';
    if (location.pathname.startsWith('/profile')) return t('profile.title') || 'Profile';
    return t('header.nav.dashboard') || 'Dashboard';
  })();

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex-shrink-0">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg lg:hidden"
          >
            <Menu className="h-6 w-6 text-slate-700 dark:text-slate-300" />
          </button>

          <div className="hidden lg:flex items-center gap-2">
            {detectMod && (
              <div className={clsx('h-2.5 w-2.5 rounded-full', detectMod.dot)} />
            )}
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {pageTitle}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 1. Home Expanding Icon Button */}
          <Link
            to="/"
            className="group flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-300 text-slate-700 dark:text-slate-300"
            aria-label="Home Page"
          >
            <Home className="h-5 w-5 shrink-0" />
            <span className="max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 transition-all duration-300 ease-in-out whitespace-nowrap text-xs font-bold overflow-hidden">
              Home
            </span>
          </Link>

          {/* 2. Disease Health Checks Expanding Icon Button */}
          <Link
            to="/modules"
            className="group flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-300 text-slate-700 dark:text-slate-300"
            aria-label="Disease Health Checks"
          >
            <Stethoscope className="h-5 w-5 shrink-0" />
            <span className="max-w-0 opacity-0 group-hover:max-w-[180px] group-hover:opacity-100 transition-all duration-300 ease-in-out whitespace-nowrap text-xs font-bold overflow-hidden">
              Disease Health Checks
            </span>
          </Link>

          {/* 3. Dashboard Expanding Icon Button */}
          <Link
            to="/dashboard"
            className="group flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-300 text-slate-700 dark:text-slate-300"
            aria-label="Dashboard"
          >
            <LayoutDashboard className="h-5 w-5 shrink-0" />
            <span className="max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 transition-all duration-300 ease-in-out whitespace-nowrap text-xs font-bold overflow-hidden">
              Dashboard
            </span>
          </Link>

          {/* 4. Mode Change (Theme Toggle Icon Button) */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-700 dark:text-slate-300"
            title="Toggle theme"
          >
            {isDark
              ? <Moon className="h-5 w-5" />
              : <Sun className="h-5 w-5" />
            }
          </button>

          <LanguageSwitcher />

          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center h-10 gap-2 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user?.email?.[0]?.toUpperCase() || 'F'}
              </div>
              <ChevronDown className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 mt-2 w-52 z-20 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Logged in as</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
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
