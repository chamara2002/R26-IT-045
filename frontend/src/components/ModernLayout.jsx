import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Sidebar, TopNavbar } from './Navigation';
import { useTheme } from '../context/ThemeContext';

export default function ModernLayout({ children, onLogout, user }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
  const { isDark } = useTheme();

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
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      {/* Desktop Sidebar - Always visible */}
      {isLargeScreen && (
        <div className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto">
          <Sidebar
            isOpen={true}
            onClose={() => setSidebarOpen(false)}
            onLogout={onLogout}
            user={user}
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
          <div className="fixed left-0 top-0 h-screen w-64 z-40">
            <Sidebar
              isOpen={true}
              onClose={() => setSidebarOpen(false)}
              onLogout={onLogout}
              user={user}
            />
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full min-w-0">
        {/* Top Navbar */}
        <TopNavbar
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          user={user}
          isDark={isDark}
          onLogout={onLogout}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-4 sm:p-6 lg:p-8 w-full">
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
