import { useState } from "react";
import { motion } from "framer-motion";
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Save, 
  Phone, 
  Building2, 
  MapPin, 
  Hash, 
  Calendar,
  ShieldCheck 
} from "lucide-react";
import { Card, Button, Input, Badge } from "../components/ui/index.jsx";
import { useI18n } from "../i18n/language-context";
import { useToast } from "../hooks/useToast";
import { updateProfile } from "../services/api";
import { PROVINCES_DISTRICTS, FARMING_EXPERIENCE_OPTIONS } from "./SignupPage";

export default function ProfilePage({ user, onProfileUpdate }) {
  const { t } = useI18n();
  const { showSuccess, showError } = useToast();

  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    email: user?.email || "",
    farm_name: user?.farm_name || "",
    province: user?.province || "",
    district: user?.district || "",
    ds_division: user?.ds_division || "",
    gn_division: user?.gn_division || "",
    farm_address: user?.farm_address || "",
    cattle_count: user?.cattle_count !== null && user?.cattle_count !== undefined ? String(user.cattle_count) : "",
    farming_experience: user?.farming_experience || "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const availableDistricts = form.province ? PROVINCES_DISTRICTS[form.province] || [] : [];

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "province") {
        updated.district = "";
      }
      return updated;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      const msg = "Full Name is required";
      setError(msg);
      showError(msg);
      return;
    }

    if (!form.phone.trim()) {
      const msg = "Mobile number is required";
      setError(msg);
      showError(msg);
      return;
    }

    if (form.password && form.password.length < 8) {
      const msg = "Password must be at least 8 characters";
      setError(msg);
      showError(msg);
      return;
    }

    if (form.password && form.password !== form.confirmPassword) {
      const msg = "Passwords do not match";
      setError(msg);
      showError(msg);
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        farm_name: form.farm_name.trim() || undefined,
        province: form.province.trim() || undefined,
        district: form.district.trim() || undefined,
        ds_division: form.ds_division.trim() || undefined,
        gn_division: form.gn_division.trim() || undefined,
        farm_address: form.farm_address.trim() || undefined,
        cattle_count: form.cattle_count ? parseInt(form.cattle_count, 10) : undefined,
        farming_experience: form.farming_experience.trim() || undefined,
      };

      if (form.password?.trim()) {
        payload.password = form.password;
      }

      const response = await updateProfile(payload);
      if (onProfileUpdate) {
        onProfileUpdate(response.user);
      }
      setForm((prev) => ({ ...prev, password: "", confirmPassword: "" }));
      showSuccess(t("profile.updated") || "Profile updated successfully");
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || t("common.serverError");
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          {t("profile.title") || "Farmer Profile & Settings"}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t("profile.subtitle") || "Manage your account credentials, contact information, and dairy farm details."}
        </p>
      </div>

      {/* Profile Card */}
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl font-black shadow-md shrink-0">
            {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'F'}
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {user?.name || 'Farmer Account'}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              {user?.phone && <span className="font-medium">{user.phone}</span>}
              {user?.phone && user?.email && <span>•</span>}
              {user?.email && <span>{user.email}</span>}
            </div>
            <div className="pt-1 flex items-center gap-2">
              <Badge variant="success">Active Farmer</Badge>
              {user?.cattle_count !== undefined && user?.cattle_count !== null && (
                <span className="text-xs text-slate-500 font-medium">
                  {user.cattle_count} Cattle Registered
                </span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Personal Details */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              1. Personal Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Farm Details */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              2. Farm Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Farm Name <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="farm_name"
                  value={form.farm_name}
                  onChange={handleChange}
                  placeholder="e.g. Green Valley Farm"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Number of Cattle *
                </label>
                <input
                  type="number"
                  min="1"
                  name="cattle_count"
                  value={form.cattle_count}
                  onChange={handleChange}
                  placeholder="e.g. 15"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Province
                </label>
                <select
                  name="province"
                  value={form.province}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">Select Province</option>
                  {Object.keys(PROVINCES_DISTRICTS).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  District
                </label>
                <select
                  name="district"
                  value={form.district}
                  onChange={handleChange}
                  disabled={!form.province}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50"
                >
                  <option value="">Select District</option>
                  {availableDistricts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  DS Division <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="ds_division"
                  value={form.ds_division}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Farming Experience <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <select
                  name="farming_experience"
                  value={form.farming_experience}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">Select experience level</option>
                  {FARMING_EXPERIENCE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Password Update */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              3. Security & Password
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Leave fields blank if you do not wish to change your login password.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Min 8 characters"
                    className="w-full pl-10 pr-10 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-type password"
                    className="w-full pl-10 pr-10 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              isLoading={isLoading}
              className="px-6 py-2.5 text-xs sm:text-sm"
            >
              <Save size={16} />
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
