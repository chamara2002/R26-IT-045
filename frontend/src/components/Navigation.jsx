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
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900 shadow-2xl lg:shadow-none">
      {/* Header */}
      <div className="h-16 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
        <Link to="/" onClick={onClose} className="flex items-center gap-3 hover:opacity-85 transition-opacity">
          <img src={CsLogo} alt="CattleSense" className="h-9 w-9 object-contain shrink-0" />
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">
              CattleSense
            </h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-medium mt-0.5">
              {t('header.nav.detection') || 'Disease Detection'}
            </p>
          </div>
        </Link>
        <button
          onClick={onClose}
          className="p-2 -mr-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 active:scale-95 transition-all lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-6 w-6" />
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
              'flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 font-semibold text-sm mb-1 active:scale-[0.99]',
              isActive('/modules') && !DISEASE_MODULES.some(m => isActive(m.href))
                ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Stethoscope className="h-5 w-5 flex-shrink-0" />
            <span className="flex-1">{t('modules.title') || 'Detection Hub'}</span>
            <ChevronRight className="h-4 w-4 opacity-50" />
          </Link>

          {/* Individual disease links */}
          <div className="space-y-1">
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
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm active:scale-[0.99]',
                    active
                      ? `${mod.activeBg} ${mod.color} ring-1 ring-current ring-opacity-20 font-semibold`
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
          <div className="space-y-1">
            {farmItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm active:scale-[0.99]',
                    active
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-semibold'
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
      <div className="border-t border-slate-200 dark:border-slate-800 p-3 space-y-1 bg-slate-50/50 dark:bg-slate-900/50">
        <Link
          to="/profile"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-sm"
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
      <div className="h-full px-3 sm:px-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 lg:hidden active:scale-95 transition-transform shrink-0"
            aria-label="Open menu drawer"
          >
            <Menu className="h-6 w-6" />
          </button>

          <Link to="/" className="flex items-center gap-2 lg:hidden shrink-0">
            <img src={CsLogo} alt="CattleSense" className="h-8 w-8 object-contain" />
            <span className="text-base font-bold text-slate-900 dark:text-white truncate">CattleSense</span>
          </Link>

          <div className="hidden lg:flex items-center gap-2">
            {detectMod && (
              <div className={clsx('h-2.5 w-2.5 rounded-full', detectMod.dot)} />
            )}
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {pageTitle}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Desktop expanding shortcuts */}
          <div className="hidden md:flex items-center gap-1">
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

            <Link
              to="/modules"
              className="group flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-300 text-slate-700 dark:text-slate-300"
              aria-label="Disease Health Checks"
            >
              <Stethoscope className="h-5 w-5 shrink-0" />
              <span className="max-w-0 opacity-0 group-hover:max-w-[180px] group-hover:opacity-100 transition-all duration-300 ease-in-out whitespace-nowrap text-xs font-bold overflow-hidden">
                Disease Checks
              </span>
            </Link>

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
          </div>

          {/* Theme Toggle Icon Button */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-700 dark:text-slate-300 active:scale-95"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {isDark
              ? <Moon className="h-5 w-5 text-amber-400" />
              : <Sun className="h-5 w-5 text-amber-500" />
            }
          </button>

          <LanguageSwitcher />

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center h-10 gap-1.5 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors active:scale-95"
              aria-label="User profile menu"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs">
                {user?.email?.[0]?.toUpperCase() || 'F'}
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 z-20 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Farmer Account</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                      {user?.name || user?.email}
                    </p>
                    {user?.name && <p className="text-xs text-slate-400 truncate">{user.email}</p>}
                  </div>
                  <div className="p-2 space-y-1">
                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                    >
                      <Settings className="h-4 w-4" />
                      Profile Settings
                    </Link>
                    <button
                      onClick={() => { setProfileOpen(false); onLogout?.(); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-medium"
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

/**
 * FarmerBottomNav — Sticky thumb-accessible bottom bar for mobile screens (< 1024px).
 * Provides instantaneous 1-tap navigation for non-tech farmers on smartphones.
 */
export function FarmerBottomNav() {
  const location = useLocation();
  const { t } = useI18n();

  const isRouteActive = (pattern) => {
    if (pattern === '/modules') {
      return location.pathname.startsWith('/modules') || location.pathname.startsWith('/detect');
    }
    if (pattern === '/cows') {
      return location.pathname.startsWith('/cows');
    }
    if (pattern === '/milk') {
      return location.pathname.startsWith('/milk');
    }
    if (pattern === '/guidance') {
      return location.pathname.startsWith('/guidance');
    }
    if (pattern === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname === pattern;
  };

  const navItems = [
    {
      id: 'dashboard',
      label: t('header.nav.dashboard') || 'Home',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'detect',
      label: t('header.nav.detection') || 'Detect',
      href: '/modules',
      icon: Stethoscope,
      highlight: true,
    },
    {
      id: 'cows',
      label: t('header.nav.cows') || 'Cattle',
      href: '/cows',
      icon: Beef,
    },
    {
      id: 'milk',
      label: t('milk.title') || 'Milk',
      href: '/milk',
      icon: Droplets,
    },
    {
      id: 'guidance',
      label: t('guidance.title') || 'Help',
      href: '/guidance',
      icon: HelpCircle,
    },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)] pb-safe"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isRouteActive(item.href);

          if (item.highlight) {
            return (
              <Link
                key={item.id}
                to={item.href}
                className="flex flex-col items-center justify-center -mt-5 group"
              >
                <div
                  className={clsx(
                    'h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-90 duration-200',
                    active
                      ? 'bg-emerald-600 text-white shadow-emerald-600/40 ring-4 ring-emerald-100 dark:ring-emerald-950'
                      : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-slate-900/20'
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <span
                  className={clsx(
                    'text-[10px] font-bold mt-1 tracking-tight truncate max-w-[64px]',
                    active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.id}
              to={item.href}
              className={clsx(
                'flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-150 active:scale-95',
                active
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              <div className="relative">
                <Icon className={clsx('h-5 w-5', active && 'stroke-[2.5]')} />
                {active && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 truncate max-w-[56px]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

