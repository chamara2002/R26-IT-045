import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AdminSidebar, AdminTopNavbar } from './AdminNavigation';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useTheme } from '../../../src/context/ThemeContext';

export default function AdminModernLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
  const { isDark } = useTheme();
  const { admin, logout } = useAdminAuth();

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased overflow-hidden">
      {/* Desktop Sidebar - Always visible in normal document flow */}
      {isLargeScreen && (
        <div className="w-72 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <AdminSidebar
            isOpen={true}
            onClose={() => setSidebarOpen(false)}
            onLogout={logout}
            admin={admin}
          />
        </div>
      )}

      {/* Mobile Sidebar - Overlay only on mobile */}
      {!isLargeScreen && sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-30"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed left-0 top-0 h-screen w-72 z-40 shadow-2xl">
            <AdminSidebar
              isOpen={true}
              onClose={() => setSidebarOpen(false)}
              onLogout={logout}
              admin={admin}
            />
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <AdminTopNavbar
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          admin={admin}
          isDark={isDark}
          onLogout={logout}
        />

        {/* Page Content (Scrollable) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>

      <Toaster
        position="top-right"
        reverseOrder={false}
        containerClassName="!z-50"
      />
    </div>
  );
}

export { AdminModernLayout as AdminLayout };
