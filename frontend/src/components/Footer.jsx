import { Leaf } from 'lucide-react';
import { Link } from 'react-router-dom';
import CsLogo from '../assets/cs-logo.png';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[1.3fr_0.8fr_0.8fr] md:items-start">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-emerald-100">
                <img src={CsLogo} alt="CattleSense" className="h-full w-full object-contain" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">CattleSense</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Machine Learning Based Early Detection of Cattle Diseases</p>
              </div>
            </div>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              A focused cattle health platform for early screening, herd tracking, and practical farm decisions.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Explore</h3>
            <nav className="mt-4 flex flex-col gap-2 text-sm">
              <a href="#features" className="text-slate-700 transition hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-400">
                Features
              </a>
              <a href="#workflow" className="text-slate-700 transition hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-400">
                Workflow
              </a>
              <Link to="/login" className="text-slate-700 transition hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-400">
                Login
              </Link>
            </nav>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Get Started</h3>
            <nav className="mt-4 flex flex-col gap-2 text-sm">
              <Link to="/signup" className="text-slate-700 transition hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-400">
                Create account
              </Link>
              <span className="text-slate-700 dark:text-slate-300">Built for farmers, vets, and dairy teams.</span>
            </nav>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Leaf size={16} className="text-emerald-600" />
            <span>Early detection. Better herd outcomes.</span>
          </div>
          <span>© 2026 CattleSense</span>
        </div>
      </div>
    </footer>
  );
}
