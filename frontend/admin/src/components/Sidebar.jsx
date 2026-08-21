import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  X, 
  LayoutDashboard, 
  Users, 
  Megaphone, 
  Activity, 
  Settings,
  UserCheck,
  LogOut,
  Home,
  ShieldCheck,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import CsLogo from '../../../src/assets/cs-logo.png';

export const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { logout, admin } = useAdminAuth();

  const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { label: 'Farmers & Accounts', icon: Users, path: '/admin/users' },
    { label: 'Admin Team', icon: UserCheck, path: '/admin/admins' },
    { label: 'Advertisements', icon: Megaphone, path: '/admin/ads' },
    { label: 'Diagnostic Logs', icon: Activity, path: '/admin/logs' },
    { label: 'System Settings', icon: Settings, path: '/admin/settings' },
  ];

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const NavContent = () => (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between shrink-0">
        <Link to="/admin" onClick={onClose} className="flex items-center gap-3 group">
          <img src={CsLogo} alt="CattleSense" className="h-9 w-9 object-contain shrink-0" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold text-white tracking-tight">CattleSense</span>
              <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Admin
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Control Room Console</p>
          </div>
        </Link>

        {/* Mobile close button */}
        <button 
          onClick={onClose}
          className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Management
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`
                flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold
                transition-all duration-150
                ${active 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold' 
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }
              `}
            >
              <Icon size={18} className={active ? 'text-white' : 'text-slate-400'} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="pt-5 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Quick Portals
        </div>

        <Link
          to="/"
          onClick={onClose}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
        >
          <Home size={18} className="text-slate-400" />
          <span>Public Website</span>
        </Link>

        <Link
          to="/modules"
          onClick={onClose}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-emerald-300/90 hover:bg-slate-900 hover:text-emerald-300 transition-colors"
        >
          <Activity size={18} className="text-emerald-400" />
          <span>Farmer Workspace</span>
        </Link>
      </nav>

      {/* Admin User Card & Logout */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-900/60 shrink-0">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm">
              {admin?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{admin?.name || 'Administrator'}</p>
              <p className="text-[10px] text-slate-400 truncate">{admin?.email || 'admin@cattlesense.com'}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Fixed Sidebar (In Normal Flow) */}
      <aside className="hidden md:flex md:flex-col md:w-64 lg:w-72 md:shrink-0 md:sticky md:top-0 md:h-screen border-r border-slate-800 z-30">
        <NavContent />
      </aside>

      {/* 2. Mobile Drawer (Overlay) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 border-r border-slate-800">
            <NavContent />
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
