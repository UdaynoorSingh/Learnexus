import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiUser, FiArrowLeft, FiKey, FiArrowRight } from 'react-icons/fi';
import { Sparkles } from 'lucide-react';
import FloatingBubbles from '../components/ui/FloatingBubbles';
import GeometricShapes from '../components/ui/GeometricShapes';
import WavyUnderline from '../components/ui/WavyUnderline';

const springTransition = { type: 'spring', stiffness: 380, damping: 32 };

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
    <div className="min-h-screen relative overflow-hidden bg-[#fafafa]">
      <FloatingBubbles />

      {/* ── Floating pill navbar ── */}
      <motion.nav
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-20 max-w-5xl mx-auto mt-5 px-4"
      >
        <div className="flex items-center justify-between px-5 py-2.5 rounded-full bg-white/75 backdrop-blur-2xl border border-black/8 shadow-lg shadow-black/[0.04]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md shadow-purple-500/15 bg-white">
              <img src="/logo.png" alt="LearnNexus" className="w-full h-full object-contain p-0.5" />
            </div>
            <span className="text-lg font-bold text-[#0f172a] tracking-tight font-['Outfit']">
              LearnNexus
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-[#64748b]">
            <span className="hover:text-[#0f172a] transition-colors cursor-pointer">Features</span>
            <span className="hover:text-[#0f172a] transition-colors cursor-pointer">How it Works</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="px-5 py-2 text-sm font-semibold text-[#0f172a] rounded-full border border-black/10 hover:bg-black/[0.03] transition-colors"
            >
              Login
            </button>
            <button
              type="button"
              className="px-5 py-2 text-sm font-semibold text-white rounded-full bg-[#7c3aed] hover:bg-[#6d28d9] transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:-translate-y-0.5"
            >
              Get Started <FiArrowRight size={15} />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* ── Main content area ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-20 pb-16">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* ── Left column — Hero text ── */}
          <motion.div
            className="flex-1 max-w-xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            {/* Badge chip */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ecfdf5] border border-[#10b981]/25 text-sm font-semibold text-[#059669] mb-7"
            >
              <Sparkles size={15} />
              AI-Powered Learning Platform
            </motion.div>

            {/* Bold hero heading */}
            <h1 className="text-[3.25rem] md:text-[4rem] lg:text-[4.75rem] font-black text-[#0f172a] leading-[1.08] tracking-tight font-['Outfit']">
              Learn{' '}
              <br className="hidden sm:block" />
              Smarter.
              <br />
              <span className="text-[#0f172a]">Let AI Do the</span>
              <br />
              <WavyUnderline color="#f59e0b" strokeWidth={4} animationDelay={0.8}>
                <span className="text-[#f59e0b]">Lifting.</span>
              </WavyUnderline>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.5 }}
              className="text-lg text-[#64748b] mt-6 leading-relaxed max-w-md"
            >
              From notes to mastery—build your knowledge
              autonomously. It's like magic, but for learning!
            </motion.p>

            {/* CTA buttons (desktop only — mobile scrolls to form) */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="hidden lg:flex items-center gap-3 mt-8"
            >
              <a
                href="#login-form"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-bold text-white rounded-full bg-[#7c3aed] hover:bg-[#6d28d9] transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:-translate-y-0.5"
              >
                Get Started <FiArrowRight size={16} />
              </a>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-bold text-[#0f172a] rounded-full border border-black/10 bg-white/70 hover:bg-white/90 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                Explore Features
              </button>
            </motion.div>
          </motion.div>

          {/* ── Right column — Login card + Geometric shapes ── */}
          <motion.div
            className="flex-1 flex flex-col items-center lg:items-end gap-8 w-full max-w-md lg:max-w-none"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
          >
            {/* Geometric shapes — visible on large screens behind the card */}
            <div className="hidden lg:block absolute right-0 top-[8rem] -z-[1] opacity-60">
              <GeometricShapes size="default" />
            </div>

            {/* Login card */}
            <div
              id="login-form"
              className="w-full max-w-md relative z-10"
            >
              <motion.div
                className="rounded-[1.75rem] bg-white/70 backdrop-blur-2xl border border-black/8 shadow-2xl shadow-black/[0.06] p-7 sm:p-9"
                initial={{ scale: 0.97, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, ...springTransition }}
              >
                {/* Card header */}
                <div className="text-center mb-7">
                  <div className="w-14 h-14 mx-auto rounded-2xl overflow-hidden mb-4 shadow-lg shadow-purple-500/15 bg-white border border-black/5">
                    <img src="/logo.png" alt="LearnNexus" className="w-full h-full object-contain p-1" />
                  </div>
                  <h2 className="text-xl font-bold text-[#0f172a] font-['Outfit'] tracking-tight">
                    {step === 1 ? 'Sign in to LearnNexus' : 'Verify your email'}
                  </h2>
                  <p className="text-sm text-[#64748b] mt-1.5 leading-relaxed">
                    {step === 1
                      ? 'University email must match a college domain your admin configured.'
                      : 'Enter the 6-digit code we sent to your inbox.'}
                  </p>
                </div>

                {/* Alerts */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm"
                      role="alert"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {info && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      className="mb-4 p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 text-sm"
                      role="status"
                    >
                      {info}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Step 1 — email + name */}
                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.form
                      key="step-1"
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={springTransition}
                      onSubmit={handleRequestOtp}
                      className="space-y-4"
                    >
                      <div>
                        <label htmlFor="stu-email" className="block text-sm font-semibold text-[#334155] mb-1.5">
                          University email
                        </label>
                        <div className="relative">
                          <FiMail
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                            size={16}
                            aria-hidden
                          />
                          <input
                            id="stu-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white/90 border border-black/10 rounded-xl text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#7c3aed] focus:ring-3 focus:ring-purple-500/15 transition-all text-sm"
                            placeholder="you@university.edu"
                            required
                            autoComplete="email"
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="stu-name" className="block text-sm font-semibold text-[#334155] mb-1.5">
                          Full name
                        </label>
                        <div className="relative">
                          <FiUser
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                            size={16}
                            aria-hidden
                          />
                          <input
                            id="stu-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white/90 border border-black/10 rounded-xl text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#7c3aed] focus:ring-3 focus:ring-purple-500/15 transition-all text-sm"
                            placeholder="Your name"
                            required
                            autoComplete="name"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:-translate-y-0.5 active:translate-y-0"
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            Email me a sign-in code <FiArrowRight size={16} />
                          </>
                        )}
                      </button>
                    </motion.form>
                  )}

                  {/* Step 2 — OTP code */}
                  {step === 2 && (
                    <motion.form
                      key="step-2"
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={springTransition}
                      onSubmit={handleVerify}
                      className="space-y-4"
                    >
                      <p className="text-xs text-[#64748b] break-all pb-1">
                        Code sent to <span className="text-[#0f172a] font-semibold">{email}</span>
                      </p>
                      <div>
                        <label htmlFor="stu-code" className="block text-sm font-semibold text-[#334155] mb-1.5">
                          6-digit code
                        </label>
                        <div className="relative">
                          <FiKey
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
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
                            className="w-full pl-10 pr-4 py-3 bg-white/90 border border-black/10 rounded-xl text-[#0f172a] text-lg tracking-[0.35em] font-mono focus:outline-none focus:border-[#7c3aed] focus:ring-3 focus:ring-purple-500/15 transition-all"
                            placeholder="000000"
                            required
                            autoComplete="one-time-code"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={loading || code.replace(/\D/g, '').length !== 6}
                        className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:-translate-y-0.5 active:translate-y-0"
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            Verify and sign in <FiArrowRight size={16} />
                          </>
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
                          className="text-sm text-[#64748b] hover:text-[#0f172a] inline-flex items-center gap-1.5 transition-colors"
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
                          className="text-sm font-semibold text-[#7c3aed] hover:underline disabled:opacity-50 transition-colors"
                        >
                          Resend code
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Geometric shapes — visible on mobile/tablet below the card */}
            <div className="lg:hidden flex justify-center">
              <GeometricShapes size="sm" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Bottom decorative accent line ── */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7c3aed]/20 to-transparent" />
    </div>
  );
};

export default LoginPage;
