import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Home,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  Sun,
  HeartPulse,
  ShieldAlert,
  Syringe,
  Thermometer,
  Brain,
  Camera,
  Activity,
  CheckCircle,
  Stethoscope,
  Users,
  Zap,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import CsLogo from '../assets/cs-logo.png';
import HeroCows from '../assets/hero-cows.jpg';
import Footer from '../components/Footer';
import LanguageSwitcher from '../components/LanguageSwitcher';
import AuthModal from '../components/AuthModal';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n/language-context';

const DISEASE_MODULES = [
  {
    key: 'mastitis',
    title: 'Mastitis Detection',
    icon: HeartPulse,
    badge: 'Udder Health',
    gradient: 'from-emerald-500 to-emerald-600',
    glow: 'shadow-emerald-500/20',
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    badgeStyle: 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-900/70 dark:text-emerald-200 dark:border-emerald-700/60 font-bold',
    desc: 'Detects udder infection early using images, milk quality data, and behavioural signals.',
    method: 'CNN + Data Fusion',
  },
  {
    key: 'fmd',
    title: 'Foot-and-Mouth Disease',
    icon: ShieldAlert,
    badge: 'Highly Contagious',
    gradient: 'from-orange-500 to-orange-600',
    glow: 'shadow-orange-500/20',
    iconBg: 'bg-orange-500/15',
    iconColor: 'text-orange-600 dark:text-orange-400',
    badgeStyle: 'bg-orange-100 text-orange-950 border border-orange-300 dark:bg-orange-900/70 dark:text-orange-200 dark:border-orange-700/60 font-bold',
    desc: 'Identifies FMD lesions in mouth and hoof photographs for rapid early-stage detection.',
    method: 'Deep CNN Classifier',
  },
  {
    key: 'lumpy',
    title: 'Lumpy Skin Disease',
    icon: Syringe,
    badge: 'Skin Condition',
    gradient: 'from-violet-500 to-violet-600',
    glow: 'shadow-violet-500/20',
    iconBg: 'bg-violet-500/15',
    iconColor: 'text-violet-600 dark:text-violet-400',
    badgeStyle: 'bg-violet-100 text-violet-950 border border-violet-300 dark:bg-violet-900/70 dark:text-violet-200 dark:border-violet-700/60 font-bold',
    desc: 'Spots LSD nodules and skin lesions across cattle body images before they spread.',
    method: 'CNN Object Detection',
  },
  {
    key: 'milk-fever',
    title: 'Milk Fever',
    icon: Thermometer,
    badge: 'Post-Calving',
    gradient: 'from-teal-500 to-teal-600',
    glow: 'shadow-teal-500/20',
    iconBg: 'bg-teal-500/15',
    iconColor: 'text-teal-600 dark:text-teal-400',
    badgeStyle: 'bg-teal-100 text-teal-950 border border-teal-300 dark:bg-teal-900/70 dark:text-teal-200 dark:border-teal-700/60 font-bold',
    desc: 'Predicts hypocalcaemia risk from post-calving clinical symptoms to act before collapse.',
    method: 'ML Classification',
  },
];

const WORKFLOW = [
  { step: '01', title: 'Select Disease Check', desc: 'Choose from 4 AI-based disease health checks for Mastitis, FMD, LSD, or Milk Fever.' },
  { step: '02', title: 'Upload & Enter Data', desc: 'Upload a photograph of the animal and optionally enter clinical symptom data for a more accurate result.' },
  { step: '03', title: 'Get AI Result', desc: 'The AI system analyses your inputs and returns a result with clear guidance and recommended actions.' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.14, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 90, damping: 18 },
  },
};

export default function LandingPage({ token, user, onLogout, onLogin }) {
  const { isDark, toggleTheme } = useTheme();
  const { t } = useI18n();
  const navigate = useNavigate();
  const isLoggedIn = Boolean(token);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const openLoginModal = () => {
    setAuthMode('login');
    setAuthModalOpen(true);
  };

  const openSignupModal = () => {
    setAuthMode('signup');
    setAuthModalOpen(true);
  };

  // Framer Motion Hero Parallax
  const { scrollY } = useScroll();

  const heroImageY = useTransform(scrollY, [0, 700], [0, 140]);
  const heroImageScale = useTransform(scrollY, [0, 700], [1, 1.1]);
  const heroContentOpacity = useTransform(scrollY, [0, 450], [1, 0.15]);
  const heroContentY = useTransform(scrollY, [0, 450], [0, -35]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      setShowScrollTop(window.scrollY > 400);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white transition-colors duration-300 relative">


      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'border-b border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-950/80 backdrop-blur-xl shadow-sm'
            : 'border-b border-transparent bg-transparent shadow-none'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 overflow-hidden rounded-xl transition-all duration-300 ${
                isScrolled
                  ? 'bg-white shadow ring-1 ring-slate-200 dark:ring-white/10'
                  : 'bg-white/90 shadow-md ring-1 ring-white/30 backdrop-blur-md'
              }`}
            >
              <img src={CsLogo} alt="CattleSense" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1
                className={`text-lg font-bold tracking-tight transition-colors duration-300 ${
                  isScrolled
                    ? 'text-slate-900 dark:text-white'
                    : 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]'
                }`}
              >
                CattleSense
              </h1>
              <p
                className={`text-[10px] uppercase tracking-widest font-medium transition-colors duration-300 ${
                  isScrolled
                    ? 'text-slate-500 dark:text-slate-400'
                    : 'text-slate-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]'
                }`}
              >
                Smart Farm Health
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* 1. Home Expanding Icon Button */}
            <Link
              to="/"
              onClick={scrollToTop}
              className={`group flex items-center gap-2 p-2 rounded-xl transition-all duration-300 ${
                isScrolled
                  ? 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                  : 'hover:bg-white/15 text-white'
              }`}
              aria-label="Home Page"
            >
              <Home className="h-5 w-5 shrink-0" />
              <span className="max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 transition-all duration-300 ease-in-out whitespace-nowrap text-xs font-bold overflow-hidden">
                Home
              </span>
            </Link>

            {/* 2. Disease Health Checks Expanding Icon Button */}
            <a
              href={isLoggedIn ? "/modules" : "#modules"}
              onClick={(e) => {
                if (isLoggedIn) {
                  e.preventDefault();
                  navigate('/modules');
                } else {
                  const el = document.getElementById('modules');
                  if (el) {
                    e.preventDefault();
                    el.scrollIntoView({ behavior: 'smooth' });
                  }
                }
              }}
              className={`group flex items-center gap-2 p-2 rounded-xl transition-all duration-300 ${
                isScrolled
                  ? 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                  : 'hover:bg-white/15 text-white'
              }`}
              aria-label="Disease Health Checks"
            >
              <Stethoscope className="h-5 w-5 shrink-0" />
              <span className="max-w-0 opacity-0 group-hover:max-w-[180px] group-hover:opacity-100 transition-all duration-300 ease-in-out whitespace-nowrap text-xs font-bold overflow-hidden">
                Disease Health Checks
              </span>
            </a>

            {/* 3. Dashboard Expanding Icon Button (When logged in) */}
            {isLoggedIn && (
              <Link
                to="/dashboard"
                className={`group flex items-center gap-2 p-2 rounded-xl transition-all duration-300 ${
                  isScrolled
                    ? 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                    : 'hover:bg-white/15 text-white'
                }`}
                aria-label="Dashboard"
              >
                <LayoutDashboard className="h-5 w-5 shrink-0" />
                <span className="max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 transition-all duration-300 ease-in-out whitespace-nowrap text-xs font-bold overflow-hidden">
                  Dashboard
                </span>
              </Link>
            )}

            {/* 4. Mode Change (Theme Toggle Icon Button) */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${
                isScrolled
                  ? 'hover:bg-slate-100 dark:hover:bg-white/8 text-slate-700 dark:text-slate-300'
                  : 'hover:bg-white/15 text-white'
              }`}
              title="Toggle theme"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <LanguageSwitcher transparent={!isScrolled} />

            {isLoggedIn ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(o => !o)}
                  className={`flex items-center h-10 gap-2 px-3 rounded-xl transition-all ${
                    isScrolled
                      ? 'hover:bg-slate-100 dark:hover:bg-white/8 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200'
                      : 'hover:bg-white/15 border border-white/20 bg-slate-900/40 backdrop-blur-md text-white'
                  }`}
                >
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-xs shrink-0">
                    {user?.email?.[0]?.toUpperCase() || 'F'}
                  </div>
                  <span
                    className={`text-sm font-semibold max-w-[150px] sm:max-w-[200px] truncate ${
                      isScrolled ? 'text-slate-800 dark:text-slate-200' : 'text-white'
                    }`}
                  >
                    {user?.email || 'Farmer'}
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 ${isScrolled ? 'text-slate-500 dark:text-slate-400' : 'text-slate-200'}`} />
                </button>

                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-52 z-20 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-white/10">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Logged in as</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.email}</p>
                      </div>
                      <div className="p-2 space-y-1">
                        <Link to="/profile" onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/8 transition-colors">
                          <Settings className="h-4 w-4" />
                          My Profile
                        </Link>
                        <Link to="/dashboard" onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/8 transition-colors">
                          <LayoutDashboard className="h-4 w-4" />
                          Go to Dashboard
                        </Link>
                        <button
                          onClick={() => { setDropdownOpen(false); onLogout?.(); navigate('/'); }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openLoginModal}
                  className={`text-sm font-medium transition-colors ${
                    isScrolled
                      ? 'text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                      : 'text-white hover:text-emerald-300 drop-shadow-sm'
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={openSignupModal}
                  className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2 text-sm font-bold text-white hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/25"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden -mt-[73px] pt-[73px] min-h-[85vh] flex flex-col justify-between">
        {/* Full-quality background photo of cows with scroll parallax */}
        <motion.div
          style={{ y: heroImageY, scale: heroImageScale }}
          className="absolute inset-0 z-0 pointer-events-none overflow-hidden origin-center"
        >
          <img
            src={HeroCows}
            alt="Cows grazing in farm landscape"
            className="w-full h-full object-cover object-[center_100%] brightness-[0.75] dark:brightness-[0.75] contrast-[1.05]"
          />
          {/* Left shadow gradient for dark readability overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/65 to-transparent" />
          {/* Top & bottom vignette blend */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-transparent to-slate-50 dark:to-slate-950" />
        </motion.div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 pt-20 sm:pt-28 pb-12 sm:pb-16 lg:px-8 w-full flex-1 flex flex-col justify-between">
          <motion.div
            style={{ opacity: heroContentOpacity, y: heroContentY }}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="max-w-2xl text-left my-auto pt-8"
          >
            {/* Main Title */}
            <motion.h1
              variants={itemVariants}
              className="mb-4 text-4xl font-black leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]"
            >
              <span className="block">Better Care,</span>
              <span className="block text-emerald-400 drop-shadow-[0_2px_12px_rgba(16,185,129,0.4)]">Healthier Cattle</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={itemVariants}
              className="mb-8 text-base sm:text-lg text-slate-200 font-medium leading-relaxed max-w-xl drop-shadow-md"
            >
              Early disease detection for a stronger, healthier herd and a better tomorrow.
            </motion.p>

            {/* Action button */}
            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4 mb-8">
              {isLoggedIn ? (
                <Link
                  to="/modules"
                  className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-3.5 text-base font-bold text-white transition-all duration-300 hover:from-emerald-600 hover:to-emerald-700 hover:scale-105 shadow-xl shadow-emerald-500/30"
                >
                  <Stethoscope className="h-5 w-5" />
                  Open Detection Hub
                  <ArrowRight className="h-5 w-5" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={openSignupModal}
                  className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-3.5 text-base font-bold text-white transition-all duration-300 hover:from-emerald-600 hover:to-emerald-700 hover:scale-105 shadow-xl shadow-emerald-500/30"
                >
                  Get Started
                  <ArrowRight className="h-5 w-5" />
                </button>
              )}
            </motion.div>
          </motion.div>

          {/* 4 Bottom Feature Cards floating overlay */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={containerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 lg:mt-12"
          >
            {[
              {
                icon: ShieldCheck,
                title: 'Early Detection',
                desc: 'Detect diseases early and take action in time.',
              },
              {
                icon: Activity,
                title: 'Health Insights',
                desc: 'Get AI-powered insights on cattle health.',
              },
              {
                icon: Users,
                title: 'Herd Management',
                desc: 'Manage your herd effortlessly in one place.',
              },
              {
                icon: Sparkles,
                title: 'Better Outcomes',
                desc: 'Healthier cows, higher productivity, better future.',
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  variants={itemVariants}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="rounded-2xl border border-white/15 bg-slate-900/60 dark:bg-slate-950/70 backdrop-blur-xl p-4 flex items-center gap-3.5 shadow-2xl hover:border-emerald-400/40 hover:bg-slate-900/80 transition-all duration-300"
                >
                  <div className="h-11 w-11 shrink-0 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <Icon className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-wide">{card.title}</h4>
                    <p className="text-xs text-slate-300 leading-snug mt-0.5">{card.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Detection Modules ──────────────────────────────────────────── */}
      <section id="modules" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="mb-14 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 dark:border-emerald-500/50 bg-emerald-100 dark:bg-emerald-950/80 px-4 py-2 text-sm font-bold text-emerald-900 dark:text-emerald-200 mb-6 shadow-xs dark:shadow-emerald-950/50">
              <Stethoscope className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              AI Disease Detection
            </div>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4">
              4 Disease Health Checks
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg">
              Each check uses a dedicated AI model trained to detect one specific disease —
              giving you fast, accurate results from a simple photo and a few health inputs.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {DISEASE_MODULES.map((mod) => {
              const Icon = mod.icon;
              return (
                <motion.div
                  key={mod.key}
                  variants={itemVariants}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className={`group rounded-3xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur p-7 hover:shadow-2xl shadow-sm ${mod.glow} transition-all duration-300 cursor-pointer`}
                  onClick={() => (isLoggedIn ? navigate(`/detect/${mod.key}`) : openSignupModal())}
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className={`h-14 w-14 rounded-2xl ${mod.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`h-7 w-7 ${mod.iconColor}`} />
                    </div>
                    <div className="text-right">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${mod.badgeStyle}`}>
                        {mod.badge}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{mod.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-5">{mod.desc}</p>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Brain className="h-3.5 w-3.5" />
                      {mod.method}
                    </span>
                    <span className={`text-xs font-bold flex items-center gap-1.5 ${mod.iconColor} group-hover:gap-2.5 transition-all`}>
                      {isLoggedIn ? 'Start Detection' : 'Sign up to use'}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section id="workflow" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="mb-14 text-center">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4">How It Works</h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">Three simple steps to detect cattle disease with AI</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Scroll-animated background line connector */}
            <div className="hidden md:block absolute top-1/2 left-12 right-12 h-1 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 rounded-full overflow-hidden z-0">
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
                className="h-full w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 origin-left"
              />
            </div>

            {WORKFLOW.map((w) => (
              <motion.div
                key={w.step}
                variants={itemVariants}
                whileHover={{ y: -6, scale: 1.02 }}
                className="relative z-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl p-8 shadow-md dark:shadow-none hover:border-emerald-500/40 transition-all duration-300"
              >
                <div className="text-5xl font-black text-emerald-500/20 dark:text-emerald-400/20 mb-4">{w.step}</div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{w.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">{w.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Platform Features ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="mb-14 text-center">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4">Built for the Farm</h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">Powerful AI, simple enough for everyday farm use</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: 'Smart AI Technology', desc: 'All four disease checks use independently trained AI models optimized for each disease type.' },
              { icon: Camera, title: 'Computer Vision', desc: 'CNN-based image classifiers for visual disease indicators such as lesions, nodules, and udder condition.' },
              { icon: Activity, title: 'Early Detection', desc: 'Designed to identify disease signals before they escalate to reduce economic and animal welfare impact.' },
              { icon: Zap, title: 'Multimodal Fusion', desc: 'Mastitis check combines image, numerical, and behavioural data streams for higher accuracy predictions.' },
              { icon: Stethoscope, title: 'Clinically Informed', desc: 'Input fields and detection logic are designed with veterinary clinical guidelines in mind.' },
              { icon: CheckCircle, title: 'Farmer Friendly', desc: 'Simple upload-and-check workflow accessible to farmers with minimal technical knowledge.' },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  variants={itemVariants}
                  whileHover={{ y: -6, scale: 1.02 }}
                  className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur p-7 hover:bg-white dark:hover:bg-white/10 hover:border-emerald-400/40 transition-all duration-300 shadow-sm dark:shadow-none"
                >
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center mb-5">
                    <Icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{f.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      {!isLoggedIn && (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={containerVariants}
          >
            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.01 }}
              className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-100 border border-emerald-200 dark:from-emerald-900/60 dark:to-teal-900/40 dark:border-emerald-800/40 p-12 text-center shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 pointer-events-none" />
              <div className="relative">
                <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4">
                  Start Using CattleSense
                </h2>
                <p className="text-emerald-800 dark:text-emerald-200 text-lg mb-8 max-w-xl mx-auto">
                  Access all four disease health checks and start protecting your herd today.
                </p>
                <button
                  type="button"
                  onClick={openSignupModal}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-10 py-4 font-bold text-white text-lg hover:from-emerald-600 hover:to-emerald-700 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300"
                >
                  Create Free Account
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        </section>
      )}

      {/* ── Floating Scroll to Top Button ──────────────────────────────────── */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            whileHover={{ scale: 1.15, y: -3 }}
            whileTap={{ scale: 0.9 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-600/40 border border-emerald-400/30 backdrop-blur-md transition-colors hover:bg-emerald-500"
            aria-label="Scroll to top"
          >
            <ChevronUp className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Interactive Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
        onLogin={onLogin}
      />

      <Footer />
    </div>
  );
}
