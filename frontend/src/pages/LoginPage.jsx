import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowLeft,
  ArrowRight,
  Activity,
  ShieldCheck,
  LineChart,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useI18n } from "../i18n/language-context";
import { loginUser, setAuthToken } from "../services/api";
import { useToast } from "../hooks/useToast";
import { Button, Input } from "../components/ui/index.jsx";
import PageWrapper from "../components/PageWrapper";

export default function LoginPage({ onLogin }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const featureCards = [
    {
      icon: Activity,
      title: "Disease Alerts",
      description: "Early warning scores from AI-assisted checks.",
    },
    {
      icon: LineChart,
      title: "Milk Trend",
      description: "Track productivity with daily and weekly insights.",
    },
    {
      icon: ShieldCheck,
      title: "Herd Safety",
      description: "Keep records organized and monitor treatment history.",
    },
  ];

  const overviewItems = [
    {
      icon: CheckCircle2,
      title: "Catch problems earlier",
      text: "Spot warning signs sooner and reduce delayed treatment decisions.",
    },
    {
      icon: LineChart,
      title: "See the bigger picture",
      text: "Track disease, milk, and herd trends from a single place.",
    },
    {
      icon: Sparkles,
      title: "Act with confidence",
      text: "Use clear outputs that help you decide the next step quickly.",
    },
  ];

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError(t("common.fillAllFields"));
      showError(t("common.fillAllFields"));
      return;
    }

    setIsLoading(true);
    try {
      const response = await loginUser({ email, password });
      setAuthToken(response.token);
      onLogin(response.user, response.token);

      if (response?.user?.role === "admin") {
        localStorage.setItem("admin_token", response.token);
        localStorage.setItem("admin_user", JSON.stringify(response.user));
        showSuccess("Welcome back! Redirecting to admin panel...");
        navigate("/admin", { replace: true });
      } else {
        showSuccess("Welcome back! Redirecting to disease health checks...");
        navigate("/modules", { replace: true });
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || t("auth.loginFailed");
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageWrapper className="min-h-screen bg-white dark:bg-slate-900 flex">
      {/* Left Side - Clean Minimal Branding */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-700 via-teal-600 to-cyan-700 flex-col justify-center p-14 text-white relative overflow-hidden"
      >
        {/* Subtle background blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-200/10 rounded-full blur-3xl -ml-40 -mb-40 pointer-events-none" />

        <div className="relative z-10 max-w-sm">
          {/* Logo + App name */}
          <div className="flex items-center gap-4 mb-10">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center overflow-hidden shadow-lg">
              <img src="/src/assets/cs-logo.png" alt="CattleSense" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">CattleSense</h1>
              <p className="text-sm text-white/70">Cattle Health Platform</p>
            </div>
          </div>

          {/* Tagline */}
          <h2 className="text-4xl font-bold leading-snug mb-4">
            Catch disease early.<br />Act before it spreads.
          </h2>
          <p className="text-white/75 text-base leading-relaxed mb-10">
            A simple tool built for farmers to check cattle health, track milk, and get clear guidance — all in one place.
          </p>

          {/* 3 simple benefits */}
          <ul className="space-y-4">
            {[
              { icon: ShieldCheck, text: 'Check for mastitis, FMD, lumpy skin & milk fever' },
              { icon: LineChart,   text: 'Track milk production and cow records easily' },
              { icon: CheckCircle2, text: 'Get clear steps on what to do next' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm text-white/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* Right Side - Form */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12"
      >
        <div className="w-full max-w-md">
          {/* Back to Home */}
          <div className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>

          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 flex items-center gap-3 justify-center">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">CattleSense</h1>
          </div>

          {/* Language Switcher */}
          <div className="mb-8 flex justify-end">
            <LanguageSwitcher />
          </div>

          {/* Form Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {t("auth.loginTitle")}
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {t("auth.loginSubtitle")}
            </p>
          </motion.div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-5"
            onSubmit={handleSubmit}
          >
            <Input
              label={t("auth.email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.emailPlaceholder")}
              icon={Mail}
              error={error && !email ? "Email is required" : ""}
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("auth.password")}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.enterPassword")}
                  className="w-full px-4 py-2.5 pl-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 dark:focus:ring-offset-slate-900 transition-all duration-200"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              >
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  {error}
                </p>
              </motion.div>
            )}

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 accent-emerald-600 cursor-pointer"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {t("auth.rememberMe") || "Remember me"}
                </span>
              </label>
              <a
                href="#"
                className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
              >
                {t("auth.forgotPassword") || "Forgot password?"}
              </a>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              isLoading={isLoading}
              className="w-full gap-2"
              size="lg"
            >
              {isLoading ? t("common.pleaseWait") : t("auth.login")}
              {!isLoading && <ArrowRight className="h-5 w-5" />}
            </Button>
          </motion.form>

          {/* Signup Link */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-center text-slate-600 dark:text-slate-400"
          >
            {t("auth.newUser")}{" "}
            <Link
              to="/signup"
              className="font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
            >
              {t("auth.createAccount")}
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </PageWrapper>
  );
}
