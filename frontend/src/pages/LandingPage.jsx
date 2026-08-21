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
  AlertTriangle,
  AlertCircle,
  Megaphone,
  ExternalLink,
} from 'lucide-react';
import CsLogo from '../assets/cs-logo.png';
import HeroCows from '../assets/hero-cows.jpg';
import Footer from '../components/Footer';
import LanguageSwitcher from '../components/LanguageSwitcher';
import AuthModal from '../components/AuthModal';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n/language-context';
import { getActiveAds } from '../services/api';

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
    symptoms: [
      'Swollen, hot, hard, or tender udder quarters',
      'Watery milk, yellowish clots, flakes, or blood traces',
      'Sudden sharp drop in milk yield or kicking during milking',
      'High body temperature, dullness, or loss of appetite',
    ],
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
    symptoms: [
      'Blisters, ulcers, or painful sores on tongue, gums, lips, or teat',
      'Excessive ropy drooling, frothing saliva, or lip smacking',
      'Severe sudden lameness, limping, or lesions around hooves',
      'High body fever (104°F+) and shivering / lethargy',
    ],
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
    symptoms: [
      'Firm, raised round skin nodules (2–5 cm) all over body and neck',
      'Watery discharge from eyes and nose with nasal crusts',
      'Enlarged, swollen superficial lymph nodes',
      'Persistent high fever, reduced feeding, and rapid weight loss',
    ],
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
    symptoms: [
      'Downer cow unable to rise or stand, especially around calving',
      'Cold ears, cold body extremities, subnormal temperature',
      'Muscle tremors, uncoordinated stumbling, or "S"-curved neck posture',
      'Dull glassy eyes, weakness, and dry muzzle',
    ],
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
  const [ads, setAds] = useState([]);
  const [adsLoading, setAdsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchActiveAds = async () => {
      try {
        const res = await getActiveAds();
        if (isMounted && res?.ads && res.ads.length > 0) {
          setAds(res.ads);
        }
      } catch (err) {
        console.warn('Could not load advertisements from API:', err);
      } finally {
        if (isMounted) setAdsLoading(false);
      }
    };
    fetchActiveAds();
    return () => {
      isMounted = false;
    };
  }, []);

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
        className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled
            ? 'border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-950/90 backdrop-blur-xl shadow-xs'
            : 'border-b border-transparent bg-transparent shadow-none'
          }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <Link
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 sm:gap-3 hover:opacity-90 transition-opacity min-w-0"
          >
            <img src={CsLogo} alt="CattleSense" className="h-8 sm:h-9 w-8 sm:w-9 object-contain shrink-0" />
            <div className="min-w-0">
              <h1
                className={`text-base sm:text-lg font-bold tracking-tight transition-colors duration-300 truncate ${isScrolled
                    ? 'text-slate-900 dark:text-white'
                    : 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]'
                  }`}
              >
                CattleSense
              </h1>
              <p
                className={`text-[9px] sm:text-[10px] uppercase tracking-widest font-medium transition-colors duration-300 truncate ${isScrolled
                    ? 'text-slate-500 dark:text-slate-400'
                    : 'text-slate-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]'
                  }`}
              >
                Smart Cattle Health
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Desktop Expanding Icon Buttons (Hidden on mobile for clarity) */}
            <div className="hidden md:flex items-center gap-1.5">
              <Link
                to="/"
                onClick={scrollToTop}
                className={`group flex items-center gap-2 p-2 rounded-xl transition-all duration-300 ${isScrolled
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
                className={`group flex items-center gap-2 p-2 rounded-xl transition-all duration-300 ${isScrolled
                    ? 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                    : 'hover:bg-white/15 text-white'
                  }`}
                aria-label="Disease Health Checks"
              >
                <Stethoscope className="h-5 w-5 shrink-0" />
                <span className="max-w-0 opacity-0 group-hover:max-w-[180px] group-hover:opacity-100 transition-all duration-300 ease-in-out whitespace-nowrap text-xs font-bold overflow-hidden">
                  Disease Checks
                </span>
              </a>

              {isLoggedIn && (
                <Link
                  to="/dashboard"
                  className={`group flex items-center gap-2 p-2 rounded-xl transition-all duration-300 ${isScrolled
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
            </div>

            {/* Theme Toggle Icon Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-colors active:scale-95 ${isScrolled
                  ? 'hover:bg-slate-100 dark:hover:bg-white/8 text-slate-700 dark:text-slate-300'
                  : 'hover:bg-white/15 text-white'
                }`}
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-amber-500" />}
            </button>

            <LanguageSwitcher transparent={!isScrolled} />

            {isLoggedIn ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(o => !o)}
                  className={`flex items-center h-9 sm:h-10 gap-1.5 px-2.5 rounded-xl transition-all active:scale-95 ${isScrolled
                      ? 'hover:bg-slate-100 dark:hover:bg-white/8 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200'
                      : 'hover:bg-white/15 border border-white/20 bg-slate-900/40 backdrop-blur-md text-white'
                    }`}
                >
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-xs shrink-0">
                    {user?.email?.[0]?.toUpperCase() || 'F'}
                  </div>
                  <span
                    className={`text-xs sm:text-sm font-semibold max-w-[90px] sm:max-w-[150px] truncate ${isScrolled ? 'text-slate-800 dark:text-slate-200' : 'text-white'
                      }`}
                  >
                    {user?.name || user?.email?.split('@')[0] || 'Farmer'}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 ${isScrolled ? 'text-slate-500 dark:text-slate-400' : 'text-slate-200'}`} />
                </button>

                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 z-20 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/50">
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Farmer Account</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.name || user?.email}</p>
                      </div>
                      <div className="p-2 space-y-1">
                        <Link to="/profile" onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/8 transition-colors font-medium">
                          <Settings className="h-4 w-4" />
                          My Profile
                        </Link>
                        <Link to="/dashboard" onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/8 transition-colors font-medium">
                          <LayoutDashboard className="h-4 w-4" />
                          Go to Dashboard
                        </Link>
                        <button
                          onClick={() => { setDropdownOpen(false); onLogout?.(); navigate('/'); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
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
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={openLoginModal}
                  className={`rounded-full border px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold transition-all shadow-xs active:scale-95 ${isScrolled
                      ? 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white'
                      : 'border-white/40 bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md text-white'
                    }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={openSignupModal}
                  className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-3.5 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-white hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-md shadow-emerald-500/25 active:scale-95"
                >
                  Get Started
                </button>
              </div>
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

        <div className="relative z-10 mx-auto max-w-7xl px-4 pt-16 sm:pt-28 pb-10 sm:pb-16 lg:px-8 w-full flex-1 flex flex-col justify-between">
          <motion.div
            style={{ opacity: heroContentOpacity, y: heroContentY }}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="max-w-2xl text-left my-auto pt-4 sm:pt-8"
          >
            {/* Top Pill Badge */}
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold backdrop-blur-md mb-4 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>{t('landing.heroBadge') || 'AI Cattle Health for Dairy Farmers'}</span>
            </motion.div>

            {/* Main Title */}
            <motion.h1
              variants={itemVariants}
              className="mb-3 sm:mb-4 text-3xl sm:text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]"
            >
              <span className="block">{t('landing.heroTitle1') || 'Better Care,'}</span>
              <span className="block text-emerald-400 drop-shadow-[0_2px_12px_rgba(16,185,129,0.4)]">
                {t('landing.heroTitle2') || 'Healthier Cattle'}
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={itemVariants}
              className="mb-6 sm:mb-8 text-sm sm:text-lg text-slate-200 font-medium leading-relaxed max-w-xl drop-shadow-md"
            >
              {t('landing.heroSubtitle') || 'Early disease detection, milk tracking, and practical veterinarian guidance for a stronger dairy herd.'}
            </motion.p>

            {/* Action button */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              {isLoggedIn ? (
                <Link
                  to="/modules"
                  className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-7 py-3.5 text-sm sm:text-base font-bold text-white transition-all duration-300 hover:from-emerald-600 hover:to-emerald-700 active:scale-95 shadow-xl shadow-emerald-500/30 min-h-[48px]"
                >
                  <Stethoscope className="h-5 w-5" />
                  <span>{t('landing.startCheck') || 'Start Disease Check'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={openSignupModal}
                  className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-7 py-3.5 text-sm sm:text-base font-bold text-white transition-all duration-300 hover:from-emerald-600 hover:to-emerald-700 active:scale-95 shadow-xl shadow-emerald-500/30 min-h-[48px]"
                >
                  <span>{t('landing.startFreeCheck') || 'Start Free Health Check'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
              <a
                href="#modules"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-md active:scale-95 transition-all min-h-[48px]"
              >
                <span>{t('landing.viewChecks') || 'View 4 Disease Checks'}</span>
              </a>
            </motion.div>
          </motion.div>

          {/* 4 Bottom Feature Cards (2x2 grid on mobile) */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={containerVariants}
            className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mt-6 lg:mt-12"
          >
            {[
              {
                icon: ShieldCheck,
                title: t('landing.feature1Title') || 'Early Detection',
                desc: t('landing.feature1Desc') || 'Spot symptoms early before milk loss.',
              },
              {
                icon: Activity,
                title: t('landing.feature2Title') || 'AI Health Checks',
                desc: t('landing.feature2Desc') || 'Instant visual & sensor diagnosis.',
              },
              {
                icon: Users,
                title: t('landing.feature3Title') || 'Herd Tracking',
                desc: t('landing.feature3Desc') || 'Track individual cow medical records.',
              },
              {
                icon: Sparkles,
                title: t('landing.feature4Title') || 'Vet Guidance',
                desc: t('landing.feature4Desc') || 'Clinical advice & direct call links.',
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  variants={itemVariants}
                  whileHover={{ y: -3 }}
                  className="rounded-2xl border border-white/15 bg-slate-900/60 dark:bg-slate-950/70 backdrop-blur-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5 shadow-2xl"
                >
                  <div className="h-9 sm:h-11 w-9 sm:w-11 shrink-0 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <Icon className="h-4 sm:h-5.5 w-4 sm:w-5.5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">{card.title}</h4>
                    <p className="text-[11px] text-slate-300 leading-tight mt-0.5">{card.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Emergency Veterinary Banner for Farmers ───────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-gradient-to-r from-red-50 via-white to-red-50 dark:from-red-950/30 dark:via-slate-900 dark:to-red-950/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                {t('landing.emergencyHelpline') || 'Emergency Farmer Helpline'}
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {t('landing.emergencyDesc') || 'Need urgent veterinary support for your cattle?'}
              </p>
            </div>
          </div>
          <Link
            to="/guidance"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs sm:text-sm font-bold transition-all shadow-xs"
          >
            <span>{t('landing.viewVetNumbers') || 'View Sri Lanka Vet Numbers'}</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* ── Detection Modules ──────────────────────────────────────────── */}
      <section id="modules" className="mx-auto max-w-7xl px-4 py-16 sm:py-20 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="mb-10 sm:mb-14 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 dark:border-emerald-500/50 bg-emerald-100 dark:bg-emerald-950/80 px-4 py-1.5 text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200 mb-4 shadow-xs">
              <Stethoscope className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              {t('landing.diseaseCheckBadge') || 'AI Disease Detection'}
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white mb-3">
              {t('modules.title') || '4 Specialized Health Checks'}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
              {t('modules.subtitle') || 'Dedicated AI models trained on cattle diseases — providing fast, accurate risk assessments from photos and clinical symptoms.'}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {DISEASE_MODULES.map((mod) => {
              const Icon = mod.icon;
              const title = t(`modules.${mod.key === 'milk-fever' ? 'milkFever' : mod.key}`) || mod.title;
              const desc = t(`modules.${mod.key === 'milk-fever' ? 'milkFeverDesc' : mod.key + 'Desc'}`) || mod.desc;

              return (
                <motion.div
                  key={mod.key}
                  variants={itemVariants}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 flex flex-col justify-between gap-4 shadow-xs hover:shadow-md transition-all cursor-pointer group active:border-emerald-500"
                  onClick={() => (isLoggedIn ? navigate(`/detect/${mod.key}`) : openSignupModal())}
                >
                  <div>
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-11 sm:h-12 w-11 sm:w-12 rounded-xl ${mod.iconBg} flex items-center justify-center shrink-0`}>
                          <Icon className="h-5 sm:h-6 w-5 sm:w-6" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                            {title}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{t('detection.diseaseModule') || 'AI Diagnostic Check'}</p>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                        {t(`modules.badges.${mod.key === 'milk-fever' ? 'milkFever' : mod.key}`) || mod.badge}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                      {desc}
                    </p>

                    {/* Clean Clinical Signs Pills */}
                    <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <AlertCircle size={13} className="text-amber-500 shrink-0" />
                        <span>{t('detection.symptomsChecklist') || 'Key Signs'}:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {mod.symptoms.map((symptom, sIdx) => (
                          <span
                            key={sIdx}
                            className="text-[11px] sm:text-xs px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 font-medium"
                          >
                            {t(`modules.symptoms.${mod.key === 'milk-fever' ? 'milkFever' : mod.key}.${sIdx}`) || symptom}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                      {t(`modules.methods.${mod.key === 'milk-fever' ? 'milkFever' : mod.key}`) || mod.method}
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                      {isLoggedIn ? (t('modules.fastCheck') || 'Start Check') : (t('modules.signInToCheck') || 'Check Now')}
                      <ArrowRight size={14} />
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
            <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4">
              {t('landing.howItWorksTitle') || 'How It Works'}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              {t('landing.howItWorksSub') || 'Three simple steps to detect cattle disease with AI'}
            </p>
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

            {[
              {
                step: '01',
                title: t('landing.step1Title') || '1. Select Disease Check',
                desc: t('landing.step1Desc') || 'Choose from 4 AI-based disease health checks for Mastitis, FMD, LSD, or Milk Fever.',
              },
              {
                step: '02',
                title: t('landing.step2Title') || '2. Upload Photo & Symptoms',
                desc: t('landing.step2Desc') || 'Take a smartphone photo and optionally select clinical signs for high accuracy.',
              },
              {
                step: '03',
                title: t('landing.step3Title') || '3. Get Instant Guidance',
                desc: t('landing.step3Desc') || 'Receive immediate AI risk assessment, care steps, and direct emergency vet contact.',
              },
            ].map((w) => (
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
            <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4">
              {t('landing.builtForFarmTitle') || 'Built for the Farm'}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              {t('landing.builtForFarmSub') || 'Powerful AI, simple enough for everyday farm use'}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: t('landing.featTech') || 'Smart AI Technology', desc: t('landing.featTechDesc') || 'Dedicated AI models trained for each disease type.' },
              { icon: Camera, title: t('landing.featVision') || 'Computer Vision', desc: t('landing.featVisionDesc') || 'CNN-based image classifiers for visual disease indicators.' },
              { icon: Activity, title: t('landing.featEarly') || 'Early Prevention', desc: t('landing.featEarlyDesc') || 'Identify disease signals before they escalate.' },
              { icon: Zap, title: t('landing.featFusion') || 'Multimodal Fusion', desc: t('landing.featFusionDesc') || 'Combines image, numerical, and behavioural data.' },
              { icon: Stethoscope, title: t('landing.featClinical') || 'Clinically Informed', desc: t('landing.featClinicalDesc') || 'Designed with veterinary clinical guidelines.' },
              { icon: CheckCircle, title: t('landing.featFarmer') || 'Farmer Friendly', desc: t('landing.featFarmerDesc') || 'Simple touch workflow accessible on mobile.' },
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

      {/* ── Partner Spotlights & Advertisements ───────────────────────────── */}
      {ads.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 border-t border-slate-200/80 dark:border-slate-800/80">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={containerVariants}
          >
            <motion.div variants={itemVariants} className="mb-12 text-center">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 text-xs font-bold uppercase tracking-wider mb-4">
                <Megaphone className="h-3.5 w-3.5" />
                <span>Featured Farm Partners & Resources</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
                Dairy Supplies & Industry Partners
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-2xl mx-auto">
                Verified nutrition solutions, cold-chain storage, and veterinary hygiene technologies empowering Sri Lankan dairy farmers.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ads.map((ad, idx) => (
                <motion.div
                  key={ad.id || idx}
                  variants={itemVariants}
                  whileHover={{ y: -6, scale: 1.02 }}
                  className="group flex flex-col rounded-3xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden shadow-sm hover:shadow-xl hover:border-emerald-500/40 transition-all duration-300"
                >
                  {/* Image banner */}
                  <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    {ad.image_url ? (
                      <img
                        src={ad.image_url}
                        alt={ad.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src =
                            'https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=800&auto=format&fit=crop&q=80';
                        }}
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white">
                        <Megaphone className="h-12 w-12 opacity-40" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/70 backdrop-blur-md text-white text-[10px] font-bold tracking-wider uppercase border border-white/20">
                        <Sparkles className="h-3 w-3 text-amber-400" />
                        Partner
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="flex flex-col flex-1 p-6 justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors mb-2 line-clamp-2">
                        {ad.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 mb-6">
                        {ad.description}
                      </p>
                    </div>

                    {ad.link && (
                      <a
                        href={ad.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white dark:bg-emerald-950/50 dark:hover:bg-emerald-600 dark:text-emerald-300 dark:hover:text-white text-xs font-bold border border-emerald-200 dark:border-emerald-800 hover:border-transparent transition-all duration-200 shadow-xs"
                      >
                        <span>Learn More / Contact Partner</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>
      )}

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

      <Footer token={token} user={user} />
    </div>
  );
}
