// Authenticated layout shell with top navigation and bottom ad section.
import Navbar from "./Navbar";
import PageAds from "./PageAds";

export default function AppShell({ user, onLogout, children }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar userName={user?.name || "Farmer"} onLogout={onLogout} />
      <main className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6">{children}</main>
      <PageAds />
    </div>
  );
}
