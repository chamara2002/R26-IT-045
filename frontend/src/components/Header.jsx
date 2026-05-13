// Professional fixed header with brand, responsive navigation, and logout.
import { Activity, Home, LogOut, Menu, ShieldCheck, UserRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useI18n } from "../i18n/language-context";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header({ onLogout }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useI18n();

  const navItems = [
    { to: "/dashboard", label: t("header.nav.dashboard"), icon: Home },
    { to: "/cows", label: t("header.nav.cows"), icon: ShieldCheck },
    { to: "/modules", label: t("header.nav.detection"), icon: Activity },
    { to: "/profile", label: t("header.nav.profile"), icon: UserRound },
  ];

  const normalizedPath = useMemo(() => {
    if (location.pathname.startsWith("/detect")) {
      return "/modules";
    }
    return location.pathname;
  }, [location.pathname]);

  const isActive = (path) => normalizedPath === path || normalizedPath.startsWith(`${path}/`);

  const closeMobileMenu = () => setMobileOpen(false);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/dashboard" className="flex items-center gap-2" onClick={closeMobileMenu}>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <ShieldCheck size={20} />
          </span>
          <span className="text-xl font-bold tracking-tight text-slate-900">CattleSense</span>
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          <LanguageSwitcher />
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={onLogout}
            className="ml-1 inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            <LogOut size={16} />
            {t("common.logout")}
          </button>
        </nav>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 p-2 text-slate-700 lg:hidden"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={t("header.toggleMenu")}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="space-y-2">
            <div className="pb-1">
              <LanguageSwitcher />
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={closeMobileMenu}
                  className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-base font-semibold transition ${
                    active
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => {
                closeMobileMenu();
                onLogout();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-base font-semibold text-white hover:bg-red-700"
            >
              <LogOut size={18} />
              {t("common.logout")}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
