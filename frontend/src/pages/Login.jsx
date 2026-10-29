import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import api, { auth, errorMessage } from '../lib/api';
import { useSettings } from '../lib/SettingsContext';
import { EyeIcon, EyeOffIcon, LockIcon } from '../Components/Icons';

export default function Login() {
  const { settings } = useSettings();
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (auth.token) return <Navigate to="/admin" replace />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { password });
      auth.set(res.data.token);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-10 bg-stone-50 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-72 bg-brand" />
      <div className="absolute top-40 -right-20 w-80 h-80 rounded-full bg-brand/20 blur-3xl" />

      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="text-center text-white mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">Admin Panel</p>
          <p className="mt-1 text-2xl font-extrabold">{settings.restaurantName}</p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl shadow-stone-900/10 border border-stone-100">
          <div className="w-14 h-14 rounded-2xl bg-brand/10 text-brand grid place-items-center mx-auto">
            <LockIcon className="w-6 h-6" />
          </div>
          <h1 className="mt-4 text-center text-2xl font-extrabold text-stone-900">Welcome back</h1>
          <p className="text-center text-stone-500 text-sm mt-1">Enter your password to manage the menu</p>

          <form onSubmit={handleLogin} className="mt-7 space-y-4">
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                autoFocus
                required
                className="w-full h-12 pl-4 pr-12 bg-stone-50 border border-stone-200 rounded-xl outline-none transition focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/15 text-sm font-medium"
              />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 px-3.5 text-stone-400 hover:text-stone-700">
                {show ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            {error && <p className="text-red-600 text-sm font-semibold bg-red-50 px-4 py-2.5 rounded-xl">{error}</p>}

            <button type="submit" disabled={loading} className="w-full h-12 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition text-sm active:scale-[0.98] disabled:opacity-60">
              {loading ? 'Logging in…' : 'Login'}
            </button>
          </form>
        </div>

        <Link to="/" className="block mt-6 text-center text-sm font-semibold text-stone-500 hover:text-stone-900">
          ← Back to menu
        </Link>
      </div>
    </div>
  );
}
