import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiUser, FiArrowLeft, FiKey, FiArrowRight } from 'react-icons/fi';
import { Sparkles } from 'lucide-react';
import BrutalistBackdrop from '../components/ui/BrutalistBackdrop';
import GeometricShapes from '../components/ui/GeometricShapes';
import WavyUnderline from '../components/ui/WavyUnderline';
import PageMascot from '../components/ui/PageMascot';

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
    <div className="min-h-screen relative overflow-hidden bg-transparent">
      <BrutalistBackdrop bubbleOpacity={0.82} />

      <motion.nav
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-20 max-w-5xl mx-auto mt-5 px-4"
      >
        <div className="ln-neo-pill flex items-center justify-between px-4 py-2.5 sm:px-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl border-2 border-[#1e2029] bg-[#fef9c3] shadow-[3px_3px_0_0_#1e2029] shrink-0 flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="" className="w-[70%] h-[70%] object-contain" />
            </div>
            <span className="text-lg font-extrabold text-[#1e2029] tracking-tight font-['Outfit'] truncate">
              LearnNexus
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-bold text-[#64748b]">
            <span className="hover:text-[#1e2029] transition-colors cursor-default">Features</span>
            <span className="hover:text-[#1e2029] transition-colors cursor-default">How it works</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              className="ln-neo-outline rounded-full px-4 py-2 text-sm font-bold hidden sm:inline-flex"
            >
              Login
            </button>
            <button
              type="button"
              className="ln-neo-primary rounded-full pl-4 pr-2 py-2 text-sm font-extrabold flex items-center gap-2 font-['Outfit']"
            >
              <span className="pr-0.5">Get started</span>
              <span className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/90 flex items-center justify-center shrink-0">
                <FiArrowRight size={14} className="text-white" aria-hidden />
              </span>
            </button>
          </div>
        </div>
      </motion.nav>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-20 pb-16">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          <motion.div
            className="flex-1 max-w-xl w-full"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,auto)] gap-8 lg:gap-10 items-start">
              <div className="min-w-0">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#d1fae5] border-2 border-[#1e2029] text-sm font-extrabold text-[#047857] mb-7 shadow-[3px_3px_0_0_#1e2029]"
                >
                  <Sparkles size={15} strokeWidth={2.5} />
                  AI-powered learning protocol
                </motion.div>

                <h1 className="text-[2.75rem] sm:text-[3.25rem] md:text-[4rem] lg:text-[4.5rem] font-black text-[#1e2029] leading-[1.06] tracking-tight font-['Outfit']">
                  Learn{' '}
                  <br className="hidden sm:block" />
                  smarter.
                  <br />
                  <span className="text-[#1e2029]">Let AI do the</span>
                  <br />
                  <WavyUnderline color="#facc15" strokeWidth={4} animationDelay={0.8}>
                    <span className="text-[#7c3aed]">Lifting.</span>
                  </WavyUnderline>
                </h1>

                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55, duration: 0.5 }}
                  className="text-lg text-[#475569] mt-6 leading-relaxed max-w-md font-medium"
                >
                  From notes to mastery—build your knowledge
                  autonomously. It's like magic, but for learning!
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="hidden lg:flex items-center gap-3 mt-8"
                >
                  <a
                    href="#login-form"
                    className="ln-neo-primary inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-extrabold font-['Outfit'] no-underline"
                  >
                    Start learning <FiArrowRight size={16} aria-hidden />
                  </a>
                  <button
                    type="button"
                    className="ln-neo-outline inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-extrabold font-['Outfit']"
                  >
                    Explore features
                  </button>
                </motion.div>
              </div>
              <div className="flex justify-center lg:justify-end lg:pt-2 pointer-events-none">
                <PageMascot role="login" size="lg" className="max-h-48 w-auto lg:max-h-none" />
              </div>
            </div>
          </motion.div>

          <motion.div
            className="flex-1 flex flex-col items-center lg:items-end gap-8 w-full max-w-md lg:max-w-none"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
          >
            <div className="hidden lg:block absolute right-0 top-[8rem] -z-[1] opacity-60">
              <GeometricShapes size="default" />
            </div>

            <div
              id="login-form"
              className="w-full max-w-md relative z-10"
            >
              <motion.div
                className="rounded-[1.75rem] bg-white border-[3px] border-[#1e2029] p-7 sm:p-9 shadow-[8px_8px_0_0_#1e2029] -rotate-1 sm:rotate-0 lg:-rotate-1"
                initial={{ scale: 0.97, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, ...springTransition }}
              >
                <div className="text-center mb-7">
                  <div className="w-14 h-14 mx-auto rounded-2xl overflow-hidden mb-4 border-2 border-[#1e2029] bg-[#fef9c3] shadow-[3px_3px_0_0_#1e2029]">
                    <img src="/logo.png" alt="LearnNexus" className="w-full h-full object-contain p-1" />
                  </div>
                  <h2 className="text-xl font-extrabold text-[#1e2029] font-['Outfit'] tracking-tight">
                    {step === 1 ? 'Sign in to LearnNexus' : 'Verify your email'}
                  </h2>
                  <p className="text-sm text-[#475569] mt-1.5 leading-relaxed font-medium">
                    {step === 1
                      ? 'University email must match a college domain your admin configured.'
                      : 'Enter the 6-digit code we sent to your inbox.'}
                  </p>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      className="mb-4 p-3 rounded-xl bg-red-50 border-2 border-[#1e2029]/30 text-red-700 text-sm font-semibold shadow-[2px_2px_0_0_rgba(30,32,41,0.12)]"
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
                      className="mb-4 p-3 rounded-xl bg-[#ede9fe] border-2 border-[#1e2029]/25 text-[#5b21b6] text-sm font-semibold shadow-[2px_2px_0_0_rgba(30,32,41,0.1)]"
                      role="status"
                    >
                      {info}
                    </motion.div>
                  )}
                </AnimatePresence>

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
                            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-[#1e2029] rounded-xl text-[#1e2029] placeholder:text-[#94a3b8] focus:outline-none focus:ring-0 focus:shadow-[3px_3px_0_0_#7c3aed] focus:border-[#7c3aed] transition-all text-sm font-medium shadow-[2px_2px_0_0_#1e2029]"
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
                            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-[#1e2029] rounded-xl text-[#1e2029] placeholder:text-[#94a3b8] focus:outline-none focus:ring-0 focus:shadow-[3px_3px_0_0_#7c3aed] focus:border-[#7c3aed] transition-all text-sm font-medium shadow-[2px_2px_0_0_#1e2029]"
                            placeholder="Your name"
                            required
                            autoComplete="name"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="ln-neo-primary w-full py-3.5 rounded-xl text-sm font-extrabold disabled:opacity-50 flex items-center justify-center gap-2 font-['Outfit']"
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
                            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-[#1e2029] rounded-xl text-[#1e2029] text-lg tracking-[0.35em] font-mono focus:outline-none focus:ring-0 focus:shadow-[3px_3px_0_0_#7c3aed] focus:border-[#7c3aed] transition-all shadow-[2px_2px_0_0_#1e2029]"
                            placeholder="000000"
                            required
                            autoComplete="one-time-code"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={loading || code.replace(/\D/g, '').length !== 6}
                        className="ln-neo-primary w-full py-3.5 rounded-xl text-sm font-extrabold disabled:opacity-50 flex items-center justify-center gap-2 font-['Outfit']"
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

            <div className="lg:hidden flex justify-center">
              <GeometricShapes size="sm" />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-2 border-t-2 border-[#1e2029]/12 bg-[#fef9c3]/80" aria-hidden />
    </div>
  );
};

export default LoginPage;
