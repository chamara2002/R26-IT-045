import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronDown,
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
} from 'lucide-react';
import CsLogo from '../assets/cs-logo.png';
import HeroCows from '../assets/hero-cows.png';
import Footer from '../components/Footer';
import LanguageSwitcher from '../components/LanguageSwitcher';
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
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

export default function LandingPage({ token, user, onLogout }) {
  const { isDark, toggleTheme } = useTheme();
  const { t } = useI18n();
  const navigate = useNavigate();
  const isLoggedIn = Boolean(token);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white transition-colors duration-300">

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-950/80 backdrop-blur-xl transition-colors duration-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-xl bg-white shadow ring-1 ring-slate-200 dark:ring-white/10">
              <img src={CsLogo} alt="CattleSense" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">CattleSense</h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-medium">Smart Farm Health</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 hover:bg-slate-100 dark:hover:bg-white/8 rounded-lg transition-colors"
              title="Toggle theme"
            >
              {isDark
                ? <Sun className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                : <Moon className="h-5 w-5 text-slate-700 dark:text-slate-300" />
              }
            </button>

            {isLoggedIn ? (
              <>
                <Link
                  to="/dashboard"
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/8 rounded-lg transition-colors"
                  title="Dashboard"
                >
                  <LayoutDashboard className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                </Link>

                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(o => !o)}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/8 transition-colors border border-slate-200/80 dark:border-white/10"
                  >
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold shadow-xs shrink-0">
                      {user?.email?.[0]?.toUpperCase() || 'F'}
                    </div>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 max-w-[150px] sm:max-w-[200px] truncate">
                      {user?.email || 'Farmer'}
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
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
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2 text-sm font-bold text-white hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/25"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Full-quality background photo of cows in farm landscape */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <img
            src={HeroCows}
            alt="Cows grazing in farm landscape"
            className="w-full h-full object-cover object-center scale-100 brightness-[0.82] dark:brightness-[0.70] contrast-[1.05] transition-all duration-300"
          />
          {/* Vignette blend for section top & bottom */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-slate-50 dark:to-slate-950" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <motion.div initial="hidden" animate="visible" variants={containerVariants} className="text-center">

            {/* Main Title with text drop shadow */}
            <motion.h1
              variants={itemVariants}
              className="mx-auto mb-6 max-w-5xl text-5xl font-black leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]"
            >
              Early Detection of{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                4 Cattle Diseases
              </span>
              <br />Using Smart AI Technology
            </motion.h1>

            {/* Feature tags */}
            <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-3.5 sm:gap-4 mb-12">
              {['4 Disease Health Checks', 'Image + Clinical AI', 'Early Detection', 'Farmer Friendly'].map(tag => (
                <span key={tag} className="inline-flex items-center gap-3 rounded-full border border-white/25 bg-slate-900/85 px-6 py-3.5 sm:px-7 sm:py-4 text-sm sm:text-base font-bold text-white backdrop-blur-md shadow-2xl tracking-wide leading-none">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                  {tag}
                </span>
              ))}
            </motion.div>

            {/* Action buttons */}
            <motion.div variants={itemVariants} className="flex flex-col justify-center gap-4 sm:flex-row sm:gap-5">
              {isLoggedIn ? (
                <Link
                  to="/modules"
                  className="inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-10 py-4.5 sm:px-12 sm:py-5 text-base sm:text-lg font-bold text-white transition-all duration-300 hover:from-emerald-600 hover:to-emerald-700 hover:scale-105 shadow-2xl shadow-emerald-500/40"
                >
                  <Stethoscope className="h-5 w-5 sm:h-6 sm:w-6" />
                  Open Detection Hub
                  <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/signup"
                    className="inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-10 py-4.5 sm:px-12 sm:py-5 text-base sm:text-lg font-bold text-white transition-all duration-300 hover:from-emerald-600 hover:to-emerald-700 hover:scale-105 shadow-2xl shadow-emerald-500/40"
                  >
                    Get Started Free
                    <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Link>
                  <a
                    href="#modules"
                    className="inline-flex items-center justify-center gap-3 rounded-2xl bg-slate-900/85 hover:bg-slate-900 border-2 border-white/40 px-10 py-4.5 sm:px-12 sm:py-5 text-base sm:text-lg font-bold text-white backdrop-blur-md shadow-2xl transition-all hover:border-emerald-400 hover:text-emerald-300"
                  >
                    See Disease Checks
                  </a>
                </>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Detection Modules ──────────────────────────────────────────── */}
      <section id="modules" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={containerVariants}>
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
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                  className={`group rounded-3xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur p-7 hover:shadow-2xl shadow-sm ${mod.glow} transition-all duration-300 cursor-pointer`}
                  onClick={() => isLoggedIn ? navigate(`/detect/${mod.key}`) : navigate('/signup')}
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
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={containerVariants}>
          <motion.div variants={itemVariants} className="mb-14 text-center">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4">How It Works</h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">Three simple steps to detect cattle disease with AI</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {WORKFLOW.map((w, i) => (
              <motion.div
                key={w.step}
                variants={itemVariants}
                className="relative rounded-3xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur p-8 shadow-sm dark:shadow-none"
              >
                <div className="text-5xl font-black text-slate-200 dark:text-white/10 mb-4">{w.step}</div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{w.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">{w.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Platform Features ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={containerVariants}>
          <motion.div variants={itemVariants} className="mb-14 text-center">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4">Built for the Farm</h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">Powerful AI, simple enough for everyday farm use</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Brain,       title: 'Smart AI Technology', desc: 'All four disease checks use independently trained AI models optimized for each disease type.' },
              { icon: Camera,      title: 'Computer Vision', desc: 'CNN-based image classifiers for visual disease indicators such as lesions, nodules, and udder condition.' },
              { icon: Activity,    title: 'Early Detection', desc: 'Designed to identify disease signals before they escalate to reduce economic and animal welfare impact.' },
              { icon: Zap,         title: 'Multimodal Fusion', desc: 'Mastitis check combines image, numerical, and behavioural data streams for higher accuracy predictions.' },
              { icon: Stethoscope, title: 'Clinically Informed', desc: 'Input fields and detection logic are designed with veterinary clinical guidelines in mind.' },
              { icon: CheckCircle, title: 'Farmer Friendly', desc: 'Simple upload-and-check workflow accessible to farmers with minimal technical knowledge.' },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  variants={itemVariants}
                  className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur p-7 hover:bg-white dark:hover:bg-white/8 transition-colors shadow-sm dark:shadow-none"
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
            viewport={{ once: true }}
            variants={containerVariants}
          >
            <motion.div
              variants={itemVariants}
              className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-100 border border-emerald-200 dark:from-emerald-900/60 dark:to-teal-900/40 dark:border-emerald-800/40 p-12 text-center"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 pointer-events-none" />
              <div className="relative">
                <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4">
                  Start Using CattleSense
                </h2>
                <p className="text-emerald-800 dark:text-emerald-200 text-lg mb-8 max-w-xl mx-auto">
                  Access all four disease health checks and start protecting your herd today.
                </p>
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-10 py-4 font-bold text-white text-lg hover:from-emerald-600 hover:to-emerald-700 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300"
                >
                  Create Free Account
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </section>
      )}

      <Footer />
    </div>
  );
}
