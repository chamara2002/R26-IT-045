import React from 'react';
import { Menu, Bell, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import CsLogo from '../../../src/assets/cs-logo.png';

export const Header = ({ onMenuClick }) => {
  const { logout, admin } = useAdminAuth();
  const location = useLocation();

  const getPageTitle = () => {
    if (location.pathname === '/admin') return 'Dashboard';
    if (location.pathname.startsWith('/admin/users')) return 'Users Management';
    if (location.pathname.startsWith('/admin/admins')) return 'Admin Users';
    if (location.pathname.startsWith('/admin/ads')) return 'Advertisements';
    if (location.pathname.startsWith('/admin/logs')) return 'Detection Logs';
    if (location.pathname.startsWith('/admin/settings')) return 'System Settings';
    if (location.pathname.startsWith('/admin/profile')) return 'Profile';
    return 'Admin Panel';
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 md:relative border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="flex w-full items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-2xl text-slate-700"
            aria-label="Toggle menu"
          >
            <Menu size={24} />
          </button>
          
          <Link to="/admin" className="hidden lg:flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center">
              <img src={CsLogo} alt="CattleSense" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight text-slate-900">CattleSense Admin</p>
              <p className="text-xs text-slate-500">Management Console</p>
            </div>
          </Link>

          <div className="min-w-0 lg:ml-3">
            <h1 className="text-base sm:text-lg font-semibold text-slate-900 truncate">
              {getPageTitle()}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button className="p-2 hover:bg-slate-100 rounded-2xl text-slate-600 relative hidden md:inline-flex">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full"></span>
          </button>

          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">{admin?.name || 'Admin'}</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center cursor-pointer hover:shadow-lg transition-shadow">
              <span className="text-white font-bold">{admin?.name?.charAt(0) || 'A'}</span>
            </div>
            <button
              onClick={logout}
              className="p-2 hover:bg-slate-100 rounded-2xl text-slate-600 transition"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
