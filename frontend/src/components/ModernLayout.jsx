import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Sidebar, TopNavbar, FarmerBottomNav } from './Navigation';
import { useTheme } from '../context/ThemeContext';

export default function ModernLayout({ children, onLogout, user }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
  const { isDark } = useTheme();

  useEffect(() => {
    const handleResize = () => {
      const isLg = window.innerWidth >= 1024;
      setIsLargeScreen(isLg);
      if (isLg) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Desktop Sidebar - Always visible */}
      {isLargeScreen && (
        <div className="w-72 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <Sidebar
            isOpen={true}
            onClose={() => setSidebarOpen(false)}
            onLogout={onLogout}
            user={user}
          />
        </div>
      )}

      {/* Mobile Sidebar - Overlay only on mobile */}
      {!isLargeScreen && (
        <>
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity duration-300"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}
          <div
            className={`fixed left-0 top-0 h-full w-[82%] max-w-[310px] z-50 transform transition-transform duration-300 ease-out shadow-2xl ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
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
      <div className="flex-1 flex flex-col w-full min-w-0 h-full overflow-hidden">
        {/* Top Navbar */}
        <TopNavbar
          onMenuClick={() => setSidebarOpen(true)}
          user={user}
          isDark={isDark}
          onLogout={onLogout}
        />

        {/* Page Content with safe padding for Mobile Bottom Navigation */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16 lg:pb-0">
          <div className="p-3.5 sm:p-5 lg:p-6 pb-4 lg:pb-4 w-full max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (< 1024px) */}
      <FarmerBottomNav />

      <Toaster
        position="top-center"
        reverseOrder={false}
        containerClassName="!z-50"
      />
    </div>
  );
}

