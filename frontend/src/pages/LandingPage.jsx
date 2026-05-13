import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Microscope,
  Moon,
  ShieldCheck,
  Stethoscope,
  Sun,
} from 'lucide-react';
import CsLogo from '../assets/cs-logo.png';
import Footer from '../components/Footer';
import { useTheme } from '../context/ThemeContext';

export default function LandingPage() {
  const { isDark, toggleTheme } = useTheme();

  const features = [
    {
      icon: Stethoscope,
      title: 'Health checks that match the farm workflow',
      description:
        'Track symptoms, upload images, and review AI findings for mastitis, FMD, lumpy skin disease, and milk fever.',
    },
    {
      icon: BarChart3,
      title: 'Milk and herd records in one place',
      description:
        'Capture milk logs, cow records, and detection history without switching between disconnected tools.',
    },
    {
      icon: Microscope,
      title: 'Modular disease detection',
      description:
        'Each disease module runs independently so the dashboard stays focused and the predictions stay specific.',
    },
    {
      icon: Activity,
      title: 'Practical next-step guidance',
      description:
        'Get clear output that helps teams decide whether to isolate, monitor, or escalate the case.',
    },
  ];

  const modules = [
    'Mastitis detection',
    'FMD screening',
    'Lumpy skin disease',
    'Milk fever support',
    'Milk yield logs',
    'Herd guidance',
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
                Machine learning based early detection
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-700 dark:hover:text-emerald-300"
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <Link
              to="/login"
              className="font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-emerald-600 px-5 py-2.5 font-semibold text-white transition hover:bg-emerald-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="text-center">
          <motion.div variants={itemVariants} className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/80 px-4 py-2 text-emerald-700 shadow-sm backdrop-blur dark:border-emerald-900/40 dark:bg-slate-900/60 dark:text-emerald-300">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-semibold">AI-powered Farm Assistant</span>
            </div>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="mx-auto mb-6 max-w-4xl text-5xl font-black leading-[0.95] tracking-tight text-slate-900 dark:text-white sm:text-6xl lg:text-7xl"
          >
            Machine Learning Based Early Detection of Cattle Diseases
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mx-auto mb-10 max-w-3xl text-lg text-slate-600 dark:text-slate-300 sm:text-xl"
          >
            CattleSense brings together disease screening, herd records, and milk tracking so farms can catch problems earlier and act with confidence.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-8 py-4 font-semibold text-white transition-all duration-300 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/50"
            >
              Get Started
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="#features"
              className="rounded-lg border-2 border-slate-300 px-8 py-4 font-semibold text-slate-900 transition hover:border-emerald-600 hover:text-emerald-600 dark:border-slate-600 dark:text-white dark:hover:border-emerald-400 dark:hover:text-emerald-400"
            >
              Learn More
            </a>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mt-16 overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/80"
          >
            <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-10">
              <div className="text-left">
                <div className="mb-5 inline-flex items-center gap-3 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                  Trusted by the full farm workflow
                </div>
                <h2 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                  Real modules. Real records. Real-time decisions.
                </h2>
                <p className="mb-6 text-slate-600 dark:text-slate-300">
                  The landing page now mirrors the product: disease modules, cow management, milk logs controls all sit under the same CattleSense brand.
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
                    <p className="text-2xl font-bold">Farm control center</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-sm text-emerald-100">Detection modules</p>
                    <p className="text-lg font-semibold">Mastitis, FMD, lumpy skin disease, milk fever</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-sm text-emerald-100">Operations</p>
                    <p className="text-lg font-semibold">Cow records, milk logs, and dashboard</p>
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
              Built around the actual CattleSense workflow
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Built for early detection, farm records, and guided decisions across the cattle health workflow.
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
            Simple flow for farmers
          </motion.h2>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                title: '1. Capture the case',
                text: 'Upload images or open a herd record from the dashboard.',
              },
              {
                title: '2. Review the result',
                text: 'Use the disease module to inspect the predicted condition and guidance.',
              },
              {
                title: '3. Act on the record',
                text: 'Update logs, track milk data, and share the outcome with the team.',
              },
            ].map((step) => (
              <motion.div
                key={step.title}
                variants={itemVariants}
                className="rounded-3xl border border-slate-200/80 bg-white/85 p-8 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70"
              >
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                  Workflow
                </p>
                <h3 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">{step.title}</h3>
                <p className="text-slate-600 dark:text-slate-300">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
