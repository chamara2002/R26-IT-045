import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import '../styles/admin-theme.css';

export const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="admin-theme flex min-h-screen flex-col bg-slate-50 text-slate-900 md:flex-row">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-auto px-4 py-6 pt-20 md:pt-6 sm:px-6">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white/95 py-4 px-4 text-center text-sm text-slate-600 backdrop-blur sm:px-6">
          <p>&copy; 2024 CattleSense Admin Panel. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};
