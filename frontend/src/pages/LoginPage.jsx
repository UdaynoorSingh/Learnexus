import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiUser, FiArrowLeft, FiKey } from 'react-icons/fi';

const slide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 }
};

const LoginPage = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { requestStudentOtp, verifyStudentOtp } = useAuth();
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const data = await requestStudentOtp(email.trim(), name.trim());
      setInfo(data.message || 'Check your email for the code.');
      setStep(2);
      setCode('');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await verifyStudentOtp(email.trim(), code.replace(/\D/g, ''));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/12 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fadeInUp overflow-hidden">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4 shadow-sm">
            <span className="text-2xl font-bold text-white">L</span>
          </div>
          <h1 className="text-3xl font-bold gradient-text">Learnexus</h1>
          <p className="text-text-muted mt-2">
            {step === 1
              ? 'University email must match a college domain your admin configured.'
              : 'Enter the 6-digit code we sent to your inbox.'}
          </p>
        </div>

        <div className="glass-card p-8 relative min-h-[320px] shadow-xl shadow-black/5">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm" role="alert">
              {error}
            </div>
          )}
          {info && (
            <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/25 text-primary text-sm" role="status">
              {info}
            </div>
          )}

          {step === 1 && (
            <motion.form
              variants={slide}
              initial="initial"
              animate="animate"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              onSubmit={handleRequestOtp}
              className="space-y-5"
            >
              <div>
                <label htmlFor="stu-email" className="block text-sm font-medium text-text-muted mb-2">
                  University email
                </label>
                <div className="relative">
                  <FiMail
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                    size={16}
                    aria-hidden
                  />
                  <input
                    id="stu-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/80 border border-black/10 rounded-xl text-text placeholder:text-text-muted/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                    placeholder="you@university.edu"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="stu-name" className="block text-sm font-medium text-text-muted mb-2">
                  Full name
                </label>
                <div className="relative">
                  <FiUser
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                    size={16}
                    aria-hidden
                  />
                  <input
                    id="stu-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/80 border border-black/10 rounded-xl text-text placeholder:text-text-muted/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                    placeholder="Your name"
                    required
                    autoComplete="name"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-gradient py-3 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Email me a sign-in code'
                )}
              </button>
            </motion.form>
          )}

          {step === 2 && (
            <motion.form
              variants={slide}
              initial="initial"
              animate="animate"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              onSubmit={handleVerify}
              className="space-y-5"
            >
              <p className="text-xs text-text-muted break-all">
                Code sent to <span className="text-text font-medium">{email}</span>
              </p>
              <div>
                <label htmlFor="stu-code" className="block text-sm font-medium text-text-muted mb-2">
                  6-digit code
                </label>
                <div className="relative">
                  <FiKey
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                    size={16}
                    aria-hidden
                  />
                  <input
                    id="stu-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full pl-10 pr-4 py-3 bg-white/80 border border-black/10 rounded-xl text-text text-lg tracking-[0.35em] font-mono focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                    placeholder="000000"
                    required
                    autoComplete="one-time-code"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || code.replace(/\D/g, '').length !== 6}
                className="w-full btn-gradient py-3 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Verify and sign in'
                )}
              </button>
              <div className="flex flex-wrap gap-3 justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError('');
                    setInfo('');
                    setCode('');
                  }}
                  className="text-sm text-text-muted hover:text-text inline-flex items-center gap-1.5"
                >
                  <FiArrowLeft size={14} />
                  Change email
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setError('');
                    setInfo('');
                    setLoading(true);
                    try {
                      const data = await requestStudentOtp(email.trim(), name.trim());
                      setInfo(data.message || 'A new code was sent.');
                    } catch (err) {
                      setError(err.response?.data?.error || 'Could not resend.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
                >
                  Resend code
                </button>
              </div>
            </motion.form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
