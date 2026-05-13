import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Lock, LogOut, Eye, EyeOff, Save, AlertCircle } from "lucide-react";
import { Card, Button, Input, Alert } from "../components/ui/index.jsx";
import { useI18n } from "../i18n/language-context";
import { useToast } from "../hooks/useToast";
import { updateProfile } from "../services/api";

export default function ProfilePage({ user, onProfileUpdate, onLogout }) {
  const { t } = useI18n();
  const { showSuccess, showError } = useToast();
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim()) {
      const errorMsg = t("common.fillAllFields");
      setError(errorMsg);
      showError(errorMsg);
      return;
    }

    if (form.password && form.password !== form.confirmPassword) {
      const errorMsg = "Passwords do not match";
      setError(errorMsg);
      showError(errorMsg);
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
      };

      if (form.password?.trim()) {
        payload.password = form.password;
      }

      const response = await updateProfile(payload);
      onProfileUpdate(response.user);
      setForm((prev) => ({ ...prev, password: "", confirmPassword: "" }));
      showSuccess(t("profile.updated") || "Profile updated successfully");
    } catch (err) {
      const errorMsg = err.response?.data?.message || t("common.serverError");
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2">
          {t("profile.title")}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          {t("profile.subtitle")}
        </p>
      </motion.div>

      {/* Profile Card */}
      <motion.div variants={itemVariants}>
        <Card className="p-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white">
              <span className="text-5xl font-bold">
                {user?.email?.[0]?.toUpperCase() || 'F'}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {user?.name || 'User'}
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {user?.email}
              </p>
              <Badge className="mt-2" variant="success">
                Account Active
              </Badge>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <Input
              label={t("profile.name")}
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              icon={User}
              placeholder="Your full name"
              error={!form.name.trim() && error ? "Name is required" : ""}
            />

            {/* Email Field */}
            <Input
              label={t("profile.email")}
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              icon={Mail}
              placeholder="your@email.com"
              error={!form.email.trim() && error ? "Email is required" : ""}
            />

            {/* Password Section */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Change Password
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Leave blank if you don't want to change your password
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Enter new password"
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

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm new password"
                      className="w-full px-4 py-2.5 pl-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 dark:focus:ring-offset-slate-900 transition-all duration-200"
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {error && <Alert variant="error" message={error} />}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
              <Button
                type="submit"
                isLoading={isLoading}
                disabled={isLoading}
                className="gap-2 flex-1"
                size="lg"
              >
                <Save className="h-5 w-5" />
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={onLogout}
                className="gap-2 flex-1"
                size="lg"
              >
                <LogOut className="h-5 w-5" />
                {t("common.logout")}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>

      {/* Additional Info */}
      <motion.div variants={itemVariants}>
        <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-800 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Data Security
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Your data is encrypted and securely stored. We never share your personal information with third parties.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// Badge component (simple inline)
function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    default: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
