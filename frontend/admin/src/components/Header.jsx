import React from 'react';
import { Menu, LogOut, ArrowUpRight, ShieldCheck, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

export const Header = ({ onMenuClick }) => {
  const { logout, admin } = useAdminAuth();
  const location = useLocation();

  const getPageInfo = () => {
    if (location.pathname === '/admin') return { title: 'Admin Overview', desc: 'Real-time herd stats & health detections' };
    if (location.pathname.startsWith('/admin/users')) return { title: 'Farmers & Accounts', desc: 'Manage farmer registrations & profiles' };
    if (location.pathname.startsWith('/admin/admins')) return { title: 'Admin Personnel', desc: 'Team members & access invites' };
    if (location.pathname.startsWith('/admin/ads')) return { title: 'Campaigns & Ads', desc: 'Manage farmer banner advertisements' };
    if (location.pathname.startsWith('/admin/logs')) return { title: 'Diagnostic Logs', desc: 'AI disease detection session records' };
    if (location.pathname.startsWith('/admin/settings')) return { title: 'System Settings', desc: 'Platform configuration & maintenance' };
    if (location.pathname.startsWith('/admin/profile')) return { title: 'Admin Profile', desc: 'Security credentials & preferences' };
    return { title: 'Admin Console', desc: 'CattleSense Management' };
  };

  const pageInfo = getPageInfo();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/90 shadow-sm backdrop-blur-md">
      <div className="flex w-full items-center justify-between px-4 sm:px-6 lg:px-8 py-3.5">
        {/* Left Side: Mobile Menu Button & Breadcrumb Info */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 hover:bg-slate-100 rounded-xl text-slate-700 transition-colors"
            aria-label="Toggle menu"
          >
            <Menu size={22} />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                {pageInfo.title}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                <ShieldCheck size={12} />
                Live
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              {pageInfo.desc}
            </p>
          </div>
        </div>

        {/* Right Side: Quick Links, Admin User Pill, Logout */}
        <div className="flex items-center gap-3">
          {/* Switch to Farmer Portal */}
          <Link
            to="/modules"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 transition-all shadow-sm"
          >
            Farmer Portal
            <ArrowUpRight size={14} />
          </Link>

          {/* User Profile Pill */}
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <Link
              to="/admin/profile"
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md shadow-emerald-500/20">
                {admin?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {admin?.name || 'Administrator'}
                </p>
                <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">
                  Admin Role
                </p>
              </div>
            </Link>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Sign out of admin console"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
