// Main application layout with fixed header, content area, and footer.
import Footer from "./Footer";
import Header from "./Header";
import PageAds from "./PageAds";

export default function Layout({ children, onLogout }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Header onLogout={onLogout} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-6 pt-24 sm:px-6 sm:pt-28">{children}</main>
      <PageAds />
      <Footer />
    </div>
  );
}
