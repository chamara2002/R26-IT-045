import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  Users, 
  Megaphone, 
  FileText, 
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import CsLogo from '../../../src/assets/cs-logo.png';

export const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { logout } = useAdminAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { label: 'Users', icon: Users, path: '/admin/users' },
    { label: 'Admin Users', icon: Users, path: '/admin/admins' },
    { label: 'Ads', icon: Megaphone, path: '/admin/ads' },
    { label: 'Logs', icon: FileText, path: '/admin/logs' },
    { label: 'Settings', icon: Settings, path: '/admin/settings' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative md:translate-x-0 top-0 left-0 z-40
        w-64 h-screen md:h-full bg-white border-r border-slate-200 text-slate-900
        transition-transform duration-300 ease-in-out
        mt-16 md:mt-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-4 py-4 sm:px-6 border-b border-slate-200 flex justify-between items-center lg:hidden">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center">
                <img src={CsLogo} alt="CattleSense" className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">CattleSense Admin</p>
                <p className="text-xs text-slate-500">Navigation</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="lg:hidden text-slate-700 hover:text-slate-900"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-2 sm:px-0">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 px-4 py-3 mx-2 rounded-2xl
                    transition-colors duration-200
                    ${isActive(item.path) 
                      ? 'bg-emerald-600 text-white' 
                      : 'text-slate-600 hover:bg-slate-100'
                    }
                  `}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Logout */}
          <div className="px-4 py-4 sm:px-6 border-t border-slate-200">
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-100 transition-colors"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">A</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-slate-900">Admin</p>
                  <p className="text-xs text-slate-500">Profile</p>
                </div>
                <ChevronDown size={16} />
              </button>

              {isProfileOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-2xl shadow-lg">
                  <Link
                    to="/admin/profile"
                    onClick={() => {
                      setIsProfileOpen(false);
                      onClose();
                    }}
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-t-2xl"
                  >
                    Edit Profile
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setIsProfileOpen(false);
                      onClose();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-b-2xl flex items-center gap-2"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
