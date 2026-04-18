import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrutalistBackdrop from '../components/ui/BrutalistBackdrop';

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { adminLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminLogin(email.trim(), password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent">
      <BrutalistBackdrop bubbleOpacity={0.42} />
      <div className="noise-overlay" />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-fadeInUp">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-900/8 ring-1 ring-white/70">
              <Shield className="h-8 w-8 text-violet-600" strokeWidth={2} aria-hidden />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-['Outfit']">Admin sign in</h1>
            <p className="mt-2 text-sm text-slate-600">Staff workspace — email and password only.</p>
            <Link
              to="/login"
              className="mt-4 inline-block text-sm font-semibold text-violet-600 hover:text-violet-700 hover:underline"
            >
              ← Student sign-in
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-8 shadow-lg shadow-slate-900/8 ring-1 ring-white/70 backdrop-blur-md">
            {error && (
              <div
                className="mb-5 rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm font-medium text-red-800"
                role="alert"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="admin-email" className="mb-2 block text-sm font-semibold text-slate-700">
                  Admin email
                </label>
                <div className="relative">
                  <FiMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200/90 bg-white py-3 pl-10 pr-4 text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-500/15"
                    placeholder="admin@yourcollege.edu"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="admin-password" className="mb-2 block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200/90 bg-white py-3 pl-10 pr-12 text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-500/15"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-gradient btn-gradient--xl flex w-full items-center justify-center gap-2 text-sm font-bold disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                ) : (
                  'Sign in to admin'
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLoginPage;
