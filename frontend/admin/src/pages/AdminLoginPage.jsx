import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AlertBox } from '../components/Badge';
import { Button } from '../components/Button';
import { ArrowLeft, Lock, User } from 'lucide-react';
import CsLogo from '../../../src/assets/cs-logo.png';

const AdminLoginPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading, isAuthenticated } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const result = await login(identifier, password);
    if (result.success) {
      navigate('/admin', { replace: true });
    } else {
      setError(result.error || 'Authentication failed. Please verify admin credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_35%),linear-gradient(135deg,#020617_0%,#0f172a_45%,#064e3b_100%)] flex flex-col items-center justify-center p-4">
      {/* Top back button */}
      <div className="w-full max-w-md mb-4 flex justify-between items-center text-xs">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-emerald-200 hover:text-white font-medium transition-colors"
        >
          <ArrowLeft size={14} />
          Back to CattleSense Platform
        </Link>
      </div>

      <div className="max-w-md w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/95 shadow-[0_30px_80px_rgba(15,23,42,0.35)] backdrop-blur">
        {/* Header */}
        <div className="bg-[linear-gradient(135deg,#0f766e_0%,#064e3b_100%)] px-8 py-9 text-center text-white relative">
          <div className="flex justify-center mb-3">
            <img src={CsLogo} alt="CattleSense" className="h-9 w-9 object-contain shrink-0" />
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-1">CattleSense Admin</h1>
          <p className="text-emerald-100/90 text-xs font-medium">Control Room & Management Console</p>
        </div>

        <div className="p-7 sm:p-8">
          {error && (
            <div className="mb-4">
              <AlertBox
                type="error"
                message={error}
                onClose={() => setError('')}
              />
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Admin Email or Mobile
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="admin@cattlesense.com or 077XXXXXXX"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Enter admin password"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm font-bold shadow-md shadow-emerald-600/30"
              disabled={loading}
            >
              {loading ? 'Authenticating Admin...' : 'Sign in to Admin Panel'}
            </Button>
          </form>

          {/* Info */}
          <div className="mt-6 pt-5 border-t border-slate-200 text-center">
            <p className="text-[11px] text-slate-500">
              Access is restricted to authorized administrators only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
