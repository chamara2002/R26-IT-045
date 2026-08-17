import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  PlayCircle,
  CheckCircle2,
  Activity,
  Sparkles,
  Users,
  Clock,
  Zap,
} from 'lucide-react';
import CsLogo from '../assets/cs-logo.png';
import FooterFarmer from '../assets/footer-farmer-landscape.png';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 18 },
  },
};

export default function Footer({ token, user }) {
  const activeToken = token || localStorage.getItem('cattlesense_token') || localStorage.getItem('admin_token') || '';
  let activeUser = user;
  if (!activeUser) {
    try {
      const raw = localStorage.getItem('cattlesense_user') || localStorage.getItem('admin_user');
      if (raw) activeUser = JSON.parse(raw);
    } catch {}
  }
  const isLoggedIn = Boolean(activeToken);
  const isAdmin = activeUser?.role === 'admin';

  return (
    <footer className="w-full bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-900 transition-colors duration-300">
      {/* ── 1. Green Stats Bar ────────────────────────────────────────── */}
      <div className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 dark:from-[#2e7d32] dark:via-[#388e3c] dark:to-[#43a047] text-white shadow-md">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={containerVariants}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x divide-white/20"
          >
            {/* Stat 1 */}
            <motion.div variants={itemVariants} className="flex items-center gap-3.5 lg:px-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/20">
                <Activity size={22} />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black leading-none tracking-tight">4</div>
                <div className="text-xs sm:text-sm font-medium text-emerald-100 mt-0.5">AI Disease Checks</div>
              </div>
            </motion.div>

            {/* Stat 2 */}
            <motion.div variants={itemVariants} className="flex items-center gap-3.5 lg:px-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/20">
                <Sparkles size={22} />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black leading-none tracking-tight">95%+</div>
                <div className="text-xs sm:text-sm font-medium text-emerald-100 mt-0.5">Detection Accuracy</div>
              </div>
            </motion.div>

            {/* Stat 3 */}
            <motion.div variants={itemVariants} className="flex items-center gap-3.5 lg:px-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/20">
                <Zap size={22} />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black leading-none tracking-tight">&lt; 5s</div>
                <div className="text-xs sm:text-sm font-medium text-emerald-100 mt-0.5">AI Response Time</div>
              </div>
            </motion.div>

            {/* Stat 4 */}
            <motion.div variants={itemVariants} className="flex items-center gap-3.5 lg:px-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/20">
                <Clock size={22} />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black leading-none tracking-tight">24/7</div>
                <div className="text-xs sm:text-sm font-medium text-emerald-100 mt-0.5">Available Anytime</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ── 2. CTA Banner with Full-Quality Background Photo ───────────────────────── */}
      <div className="relative overflow-hidden bg-slate-950 border-b border-slate-800/80">
        {/* Photo Background */}
        <div className="absolute inset-0 z-0">
          <img
            src={FooterFarmer}
            alt="Cattle grazing in green pasture landscape"
            className="h-full w-full object-cover object-[center_70%] brightness-100 contrast-[1.05] scale-100"
          />
          {/* Rich dark gradient overlay for full-clarity photo matching top hero image */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-950/30 sm:to-transparent" />
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
          className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16 text-white"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <motion.div variants={itemVariants} className="lg:col-span-7">
              <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase mb-2 block drop-shadow-sm">
                CattleSense Platform
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight mb-3 drop-shadow-md">
                AI-Powered Early Detection of Cattle Diseases
              </h2>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-xl mb-6 drop-shadow-sm">
                A focused cattle health platform for early screening, herd tracking, and practical farm decisions.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="#modules"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#43a047] hover:bg-[#388e3c] px-5 py-2.5 text-xs sm:text-sm font-bold text-white transition-all shadow-lg shadow-emerald-950/50 hover:scale-105"
                >
                  Explore Features
                  <ArrowRight size={16} />
                </a>
                <a
                  href="#workflow"
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-950/60 hover:bg-slate-900 border border-white/20 backdrop-blur-md px-5 py-2.5 text-xs sm:text-sm font-bold text-white transition-all shadow-sm hover:scale-105"
                >
                  Learn How It Works
                  <PlayCircle size={16} />
                </a>
              </div>
            </motion.div>

            {/* Right Checklist */}
            <motion.div variants={itemVariants} className="lg:col-span-5 space-y-3">
              {[
                'Fast and accurate AI results',
                'Practical insights and guidance',
                'Secure and private data',
                'Built for farmers, vets, and dairy teams.',
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ y: -3, scale: 1.01 }}
                  className="rounded-2xl border border-white/15 bg-slate-900/60 dark:bg-slate-950/70 backdrop-blur-xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-2xl hover:border-emerald-400/40 hover:bg-slate-900/80 transition-all duration-300"
                >
                  <div className="h-9 w-9 shrink-0 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <CheckCircle2 size={18} />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-white tracking-wide">{item}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* ── 3. Main Footer Links (CattleSense Web App Details) ──────── */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand Info */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-3 hover:opacity-85 transition-opacity">
              <img src={CsLogo} alt="CattleSense" className="h-9 w-9 object-contain shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                  CattleSense
                </h3>
                <p className="text-[10px] uppercase tracking-widest font-medium text-slate-500 dark:text-slate-400 mt-1">
                  Smart Cattle Health
                </p>
              </div>
            </Link>
          </div>

          {/* Disease Checks */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">Disease Checks</h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link to="/detect/mastitis" className="text-slate-600 dark:text-slate-400 transition hover:text-emerald-600 dark:hover:text-white">
                  Mastitis Health Check
                </Link>
              </li>
              <li>
                <Link to="/detect/fmd" className="text-slate-600 dark:text-slate-400 transition hover:text-emerald-600 dark:hover:text-white">
                  Foot-and-Mouth (FMD)
                </Link>
              </li>
              <li>
                <Link to="/detect/lumpy" className="text-slate-600 dark:text-slate-400 transition hover:text-emerald-600 dark:hover:text-white">
                  Lumpy Skin Disease (LSD)
                </Link>
              </li>
              <li>
                <Link to="/detect/milk-fever" className="text-slate-600 dark:text-slate-400 transition hover:text-emerald-600 dark:hover:text-white">
                  Milk Fever Risk Check
                </Link>
              </li>
            </ul>
          </div>

          {/* Farm Management */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">Farm Management</h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link to="/dashboard" className="text-slate-600 dark:text-slate-400 transition hover:text-emerald-600 dark:hover:text-white">
                  Farm Dashboard
                </Link>
              </li>
              <li>
                <Link to="/cows" className="text-slate-600 dark:text-slate-400 transition hover:text-emerald-600 dark:hover:text-white">
                  Herd Management
                </Link>
              </li>
              <li>
                <Link to="/milk" className="text-slate-600 dark:text-slate-400 transition hover:text-emerald-600 dark:hover:text-white">
                  Milk Production Logs
                </Link>
              </li>
              <li>
                <Link to="/guidance" className="text-slate-600 dark:text-slate-400 transition hover:text-emerald-600 dark:hover:text-white">
                  Farmer Guidance
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">Platform</h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link to="/about" className="text-slate-600 dark:text-slate-400 transition hover:text-emerald-600 dark:hover:text-white">
                  About CattleSense
                </Link>
              </li>
              <li>
                <Link to="/modules" className="text-slate-600 dark:text-slate-400 transition hover:text-emerald-600 dark:hover:text-white">
                  Detection Hub
                </Link>
              </li>
              <li>
                <Link to="/profile" className="text-slate-600 dark:text-slate-400 transition hover:text-emerald-600 dark:hover:text-white">
                  User Profile
                </Link>
              </li>
              <li>
                <a href="#workflow" className="text-slate-600 dark:text-slate-400 transition hover:text-emerald-600 dark:hover:text-white">
                  How It Works
                </a>
              </li>
            </ul>
          </div>

          {/* Dynamic Workspace / Get Started Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              {isLoggedIn ? (isAdmin ? 'Admin Workspace' : 'Farmer Workspace') : 'Get Started'}
            </h4>
            <div className="mt-3 space-y-2">
              {isLoggedIn ? (
                <>
                  <Link
                    to={isAdmin ? '/admin' : '/modules'}
                    className="block w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-[#43a047] dark:hover:bg-[#388e3c] px-4 py-2 text-center text-xs font-bold text-white transition-colors shadow-sm"
                  >
                    {isAdmin ? 'Admin Console' : 'Start Health Check'}
                  </Link>
                  <Link
                    to={isAdmin ? '/modules' : '/dashboard'}
                    className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 px-4 py-2 text-center text-xs font-bold text-slate-800 dark:text-white transition-colors shadow-sm"
                  >
                    {isAdmin ? 'Disease Detection Hub' : 'My Farm Dashboard'}
                  </Link>
                  {activeUser?.name && (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium pt-1 text-center truncate">
                      ✓ {activeUser.name}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <Link
                    to="/signup"
                    className="block w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-[#43a047] dark:hover:bg-[#388e3c] px-4 py-2 text-center text-xs font-bold text-white transition-colors shadow-sm"
                  >
                    Create Account
                  </Link>
                  <Link
                    to="/login"
                    className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 px-4 py-2 text-center text-xs font-bold text-slate-800 dark:text-white transition-colors shadow-sm"
                  >
                    Login
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Copyright Bar */}
        <div className="mt-10 border-t border-slate-200 dark:border-slate-800/80 pt-6 text-center text-xs text-slate-500">
          © 2026 CattleSense. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
