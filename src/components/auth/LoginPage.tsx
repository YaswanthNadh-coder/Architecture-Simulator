import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Zap, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Turnstile } from './Turnstile';

export const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loading, error, clearError, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [localErr, setLocalErr] = useState('');
  const verified = searchParams.get('verified') === 'true';
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  const handleCaptchaVerify = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  const handleCaptchaExpire = useCallback(() => {
    setCaptchaToken(null);
  }, []);

  // Clear any stale auth errors when the login page mounts
  // (e.g. from a previous session or email confirmation redirect)
  useEffect(() => {
    clearError();
  }, [clearError]);

  // If user is already authenticated (e.g. after email confirmation),
  // redirect to home immediately
  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate('/');
    }
  }, [isAuthenticated, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalErr('');
    clearError();
    if (!email || !password) { setLocalErr('Please fill in all fields.'); return; }
    if (siteKey && !captchaToken) { setLocalErr('Please complete the CAPTCHA verification.'); return; }
    
    const { error: err } = await login(email, password, captchaToken || undefined);
    if (!err) {
      navigate('/');
    } else {
      // Reset captcha on failure so user can retry
      setCaptchaToken(null);
      setCaptchaResetKey(k => k + 1);
    }
  };

  const displayError = localErr || error;

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-y-auto p-4 py-12 pb-24 custom-scrollbar"
      style={{ background: 'var(--color-bg-base)' }}>

      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="rounded-2xl border p-8"
          style={{
            background: 'rgba(15, 30, 51, 0.85)',
            borderColor: 'var(--color-border-subtle)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.08)',
          }}>

          {/* Logo + heading */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-500 to-cyan-400 flex items-center justify-center text-white font-bold text-2xl mb-4 shadow-lg"
              style={{ boxShadow: '0 0 30px rgba(59,130,246,0.4)' }}>
              A
            </div>
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-text-muted text-sm mt-1">Sign in to ArchSim</p>
          </div>

          {/* Email verified banner */}
          {verified && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 mb-6 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
            >
              <CheckCircle size={16} />
              Email verified successfully! You can now sign in.
            </motion.div>
          )}



          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@university.edu"
              icon={<Mail size={15} />}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Password</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"><Lock size={15} /></div>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-bg-base border border-border-subtle rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-text-muted/50 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors">
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={async () => {
                if (!email) { setLocalErr('Enter your email first, then click "Forgot password?"'); return; }
                const { error: resetErr } = await (await import('../../lib/supabase')).supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: `${window.location.origin}/login`,
                });
                if (resetErr) { setLocalErr(resetErr.message); }
                else { setLocalErr(''); alert(`Password reset link sent to ${email}. Check your inbox.`); }
              }} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                Forgot password?
              </button>
            </div>

            {displayError && (
              <div className="rounded-lg px-3 py-2.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20">
                {displayError}
              </div>
            )}

            {/* Cloudflare Turnstile CAPTCHA */}
            <div className="flex justify-center my-2">
              <Turnstile 
                onVerify={handleCaptchaVerify}
                onExpire={handleCaptchaExpire}
                resetKey={captchaResetKey}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 relative overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                boxShadow: '0 0 20px rgba(59,130,246,0.35)',
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-text-muted text-sm mt-6">
            No account?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Create one free
            </Link>
          </p>
        </div>

        {/* Product pitch */}
        <div className="flex items-center justify-center gap-6 mt-6 text-xs text-text-muted">
          {['MIPS Pipeline', 'Hazard Detection', 'Real-time Forwarding'].map(f => (
            <div key={f} className="flex items-center gap-1">
              <Zap size={10} className="text-brand-500" /> {f}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

const Field = ({ label, type, value, onChange, placeholder, icon }: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string; icon: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-medium text-text-muted uppercase tracking-wider">{label}</label>
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">{icon}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-bg-base border border-border-subtle rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-text-muted/50 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all"
      />
    </div>
  </div>
);
