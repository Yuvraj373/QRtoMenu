import { Link, NavLink, useNavigate } from 'react-router-dom';
import { auth } from '../lib/api';
import { LOGIN_PATH } from '../lib/config';
import { useSettings } from '../lib/SettingsContext';
import { ExternalIcon, ListIcon, LogoutIcon, SettingsIcon } from './Icons';

const tabs = [
  { to: '/admin', label: 'Menu Items', Icon: ListIcon },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
];

export default function AdminLayout({ title, subtitle, actions, children }) {
  const navigate = useNavigate();
  const { settings } = useSettings();

  const logout = () => {
    auth.clear();
    navigate(LOGIN_PATH, { replace: true });
  };

  return (
    <div className="min-h-dvh bg-stone-50 pb-24 md:pb-10">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link to="/admin" className="flex items-center gap-2.5 min-w-0">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-brand text-white font-extrabold text-lg shrink-0">
              {settings.restaurantName?.[0]?.toUpperCase() || 'M'}
            </span>
            <span className="min-w-0">
              <span className="block font-extrabold text-stone-900 truncate leading-tight">{settings.restaurantName}</span>
              <span className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Admin</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-6">
            {tabs.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-bold transition ${isActive ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`
                }
              >
                <Icon className="w-4 h-4" /> {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2 h-10 px-3 sm:px-4 rounded-xl text-sm font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 transition">
              <ExternalIcon className="w-4 h-4" /> <span className="hidden sm:inline">View Menu</span>
            </a>
            <button onClick={logout} aria-label="Logout" className="flex items-center gap-2 h-10 px-3 sm:px-4 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition">
              <LogoutIcon className="w-4 h-4" /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">{title}</h1>
            {subtitle && <p className="text-sm text-stone-500 mt-1">{subtitle}</p>}
          </div>
          {actions}
        </div>
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-stone-200 grid grid-cols-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold transition ${isActive ? 'text-brand' : 'text-stone-500'}`}
          >
            <Icon className="w-5 h-5" /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
