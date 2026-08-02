import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BarChart3,
  ChevronDown,
  HelpCircle,
  Info,
  LayoutDashboard,
  LogOut,
  Microscope,
  Moon,
  Settings,
  ShieldCheck,
  Stethoscope,
  Sun,
} from 'lucide-react';
import CsLogo from '../assets/cs-logo.png';
import Footer from '../components/Footer';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n/language-context';

export default function LandingPage({ token, user, onLogout }) {
  const { isDark, toggleTheme } = useTheme();
  const { t } = useI18n();
  const navigate = useNavigate();
  const isLoggedIn = Boolean(token);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const features = [
    { icon: Stethoscope, title: t('landing.feature1Title'), description: t('landing.feature1Desc') },
    { icon: BarChart3,   title: t('landing.feature2Title'), description: t('landing.feature2Desc') },
    { icon: Microscope,  title: t('landing.feature3Title'), description: t('landing.feature3Desc') },
    { icon: Activity,    title: t('landing.feature4Title'), description: t('landing.feature4Desc') },
  ];

  const modules = [
    t('landing.module1'), t('landing.module2'), t('landing.module3'),
    t('landing.module4'), t('landing.module5'), t('landing.module6'),
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.16,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#ffffff_52%,#ecfeff_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_35%),linear-gradient(180deg,#020617_0%,#0f172a_52%,#052e2b_100%)]">
      <nav className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-emerald-100">
              <img src={CsLogo} alt="CattleSense" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                CattleSense
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                {t('landing.navSubtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Theme toggle — same style as TopNavbar */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Toggle theme"
            >
              {isDark ? <Sun className="h-5 w-5 text-slate-700 dark:text-slate-300" /> : <Moon className="h-5 w-5 text-slate-700 dark:text-slate-300" />}
            </button>

            {isLoggedIn ? (
              <>
                {/* Dashboard icon button — same style as TopNavbar Home button */}
                <Link
                  to="/dashboard"
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title={t('landing.goToDashboardShort')}                >
                  <LayoutDashboard className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                </Link>

                {/* User avatar dropdown — same style as TopNavbar */}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {user?.email?.[0]?.toUpperCase() || 'F'}
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[160px] truncate">
                      {user?.email}
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </button>

                  {dropdownOpen && (
                    <>
                      {/* Backdrop */}
                      <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                      <div className="absolute right-0 mt-2 w-52 z-20 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        {/* User info */}
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                          <p className="text-xs text-slate-500 dark:text-slate-400">{t('landing.loggedInAs')}</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{user?.email}</p>
                        </div>
                        <div className="p-2 space-y-1">
                          <Link
                            to="/profile"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Settings className="h-4 w-4" />
                            {t('landing.myProfile')}
                          </Link>
                          <Link
                            to="/dashboard"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            <LayoutDashboard className="h-4 w-4" />
                            {t('landing.goToDashboardShort')}
                          </Link>
                          <button
                            onClick={() => {
                              setDropdownOpen(false);
                              onLogout?.();
                              navigate('/');
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <LogOut className="h-4 w-4" />
                            {t('landing.logout')}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                >
                  {t('landing.login')}
                </Link>
                <Link
                  to="/signup"
                  className="rounded-full bg-emerald-600 px-5 py-2.5 font-semibold text-white transition hover:bg-emerald-700"
                >
                  {t('landing.getStarted')}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="text-center">
          <motion.div variants={itemVariants} className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/80 px-4 py-2 text-emerald-700 shadow-sm backdrop-blur dark:border-emerald-900/40 dark:bg-slate-900/60 dark:text-emerald-300">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-semibold">{t('landing.tagline')}</span>
            </div>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="mx-auto mb-6 max-w-4xl text-5xl font-black leading-[0.95] tracking-tight text-slate-900 dark:text-white sm:text-6xl lg:text-7xl"
          >
            {t('landing.hero')}
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mx-auto mb-10 max-w-3xl text-lg text-slate-600 dark:text-slate-300 sm:text-xl"
          >
            {t('landing.heroSub')}
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col justify-center gap-4 sm:flex-row">
            {isLoggedIn ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-8 py-4 font-semibold text-white transition-all duration-300 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/50"
              >
                {t('landing.goToDashboard')}
                <ArrowRight className="h-5 w-5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-8 py-4 font-semibold text-white transition-all duration-300 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/50"
                >
                  {t('landing.getStarted')}
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <a
                  href="#features"
                  className="rounded-lg border-2 border-slate-300 px-8 py-4 font-semibold text-slate-900 transition hover:border-emerald-600 hover:text-emerald-600 dark:border-slate-600 dark:text-white dark:hover:border-emerald-400 dark:hover:text-emerald-400"
                >
                  {t('landing.learnMore')}
                </a>
              </>
            )}
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mt-16 overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/80"
          >
            <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-10">
              <div className="text-left">
                <div className="mb-5 inline-flex items-center gap-3 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                  {t('landing.platformBadge')}
                </div>
                <h2 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                  {t('landing.platformTitle')}
                </h2>
                <p className="mb-6 text-slate-600 dark:text-slate-300">
                  {t('landing.platformDesc')}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {modules.map((module) => (
                    <div
                      key={module}
                      className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-700/80 dark:bg-slate-950/40 dark:text-slate-200"
                    >
                      {module}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] bg-[linear-gradient(135deg,#0f766e_0%,#064e3b_100%)] p-6 text-white shadow-2xl sm:p-8">
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
                    <img src={CsLogo} alt="CattleSense" className="h-full w-full object-contain" />
                  </div>
                  <div>
                    <p className="text-sm text-emerald-100">CattleSense Platform</p>
                    <p className="text-lg font-semibold">{t('landing.farmControl')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-sm text-emerald-100">{t('landing.detectionModules')}</p>
                    <p className="text-lg font-semibold">Mastitis, FMD, lumpy skin disease, milk fever</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-sm text-emerald-100">{t('landing.operations')}</p>
                    <p className="text-lg font-semibold">{t('landing.operationsList')}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={containerVariants}>
          <motion.div variants={itemVariants} className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-slate-900 dark:text-white">
              {t('landing.featuresTitle')}
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              {t('landing.featuresSub')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  variants={itemVariants}
                  className="group rounded-3xl border border-slate-200/80 bg-white/85 p-8 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/70"
                >
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 transition-colors group-hover:bg-emerald-200 dark:bg-emerald-900/30 dark:group-hover:bg-emerald-900/50">
                    <Icon className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">{feature.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={containerVariants}>
          <motion.h2 variants={itemVariants} className="mb-16 text-center text-4xl font-bold text-slate-900 dark:text-white">
          {t('landing.workflowTitle')}
          </motion.h2>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { title: t('landing.step1Title'), text: t('landing.step1Text') },
              { title: t('landing.step2Title'), text: t('landing.step2Text') },
              { title: t('landing.step3Title'), text: t('landing.step3Text') },
            ].map((step) => (
              <motion.div
                key={step.title}
                variants={itemVariants}
                className="rounded-3xl border border-slate-200/80 bg-white/85 p-8 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70"
              >
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                  {t('landing.workflowLabel')}
                </p>
                <h3 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">{step.title}</h3>
                <p className="text-slate-600 dark:text-slate-300">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* About CattleSense Section */}
      <section id="about" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={containerVariants}>
          <motion.div variants={itemVariants} className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-slate-900 dark:text-white">
              {t('about.title')}
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-300">
              {t('about.subtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <motion.div
              variants={itemVariants}
              className="rounded-3xl border border-slate-200/80 bg-white/85 p-8 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
                <Info className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">
                {t('about.whatWeDo')}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {t('about.whatWeDoDesc')}
              </p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="rounded-3xl border border-slate-200/80 bg-white/85 p-8 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 dark:bg-teal-900/30">
                <HelpCircle className="h-7 w-7 text-teal-600 dark:text-teal-400" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">
                {t('about.howWeHelp')}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {t('about.howWeHelpDesc')}
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}

