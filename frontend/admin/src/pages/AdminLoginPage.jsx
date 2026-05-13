import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AlertBox } from '../components/Badge';
import { Button } from '../components/Button';
import CsLogo from '../../../src/assets/cs-logo.png';

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAdminAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const result = await login(email, password);
    if (result.success) {
      navigate('/admin');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_35%),linear-gradient(135deg,#020617_0%,#0f172a_45%,#064e3b_100%)] flex items-center justify-center p-4">
      <div className="max-w-md w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/95 shadow-[0_30px_80px_rgba(15,23,42,0.35)] backdrop-blur">
        {/* Header */}
        <div className="bg-[linear-gradient(135deg,#0f766e_0%,#064e3b_100%)] px-8 py-10 text-center text-white">
          <div className="mx-auto mb-5 h-20 w-20 rounded-3xl overflow-hidden bg-white/15 ring-1 ring-white/20 flex items-center justify-center shadow-lg">
            <img src={CsLogo} alt="CattleSense" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-2">CattleSense Admin</h1>
          <p className="text-emerald-100 font-medium">Control room for users, ads, logs, and settings</p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-emerald-50">
            Farm operations console
          </div>
        </div>

        <div className="p-8 sm:p-10">

        {error && (
          <AlertBox 
            type="error" 
            message={error} 
            onClose={() => setError('')}
          />
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Admin email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              placeholder="admin@cattlesense.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              placeholder="Enter your password"
              required
            />
          </div>

          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            className="w-full mt-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in to admin console'}
          </Button>
        </form>

        {/* Info */}
        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-500">
            Access is restricted to approved administrators.<br/>
            Contact your system administrator if you need an account.
          </p>
        </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
