import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Turnstile } from './Turnstile';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, resendVerification, loginWithGoogle, loading, error, clearError } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<'student' | 'instructor'>('student');
  const [showPwd, setShowPwd] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [localErr, setLocalErr] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const timeoutRef = useRef<number | null>(null);

  const handleCaptchaVerify = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  const handleCaptchaExpire = useCallback(() => {
    setCaptchaToken(null);
  }, []);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalErr('');
    clearError();
    if (!fullName || !email || !password || !confirm) { setLocalErr('Please fill in all fields.'); return; }
    if (password !== confirm) { setLocalErr('Passwords do not match.'); return; }
    if (password.length < 6) { setLocalErr('Password must be at least 6 characters.'); return; }
    if (!agreed) { setLocalErr('Please accept the terms of service.'); return; }
    // Check CAPTCHA if site key is configured
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    if (siteKey && !captchaToken) { setLocalErr('Please complete the CAPTCHA verification.'); return; }
    const { error: err } = await register(email, password, fullName, role, captchaToken || undefined);
    if (!err) {
      setSuccess(true);
      timeoutRef.current = window.setTimeout(() => navigate('/login'), 8000);
    } else {
      // Reset captcha on failure so user can retry
      setCaptchaToken(null);
      setCaptchaResetKey(k => k + 1);
    }
  };

  const handleResend = async () => {
    setResendSuccess(false);
    const { error: err } = await resendVerification();
    if (!err) {
      setResendSuccess(true);
      setResendCooldown(60); // 60-second cooldown
    } else {
      setLocalErr(err);
    }
  };

  const displayError = localErr || error;

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-base)' }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8 rounded-2xl border max-w-sm"
          style={{ background: 'rgba(15,30,51,0.9)', borderColor: 'var(--color-border-subtle)' }}>
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Check your email!</h2>
          <p className="text-text-muted text-sm">We sent a confirmation link to <span className="text-white">{email}</span>. Click it to activate your account.</p>

          {resendSuccess && (
            <div className="mt-3 rounded-lg px-3 py-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
              Verification email resent!
            </div>
          )}

          <button
            type="button"
            onClick={handleResend}
            disabled={loading || resendCooldown > 0}
            className="mt-4 text-sm text-brand-400 hover:text-brand-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendCooldown > 0
              ? `Resend available in ${resendCooldown}s`
              : loading
                ? 'Sending…'
                : 'Resend verification email'}
          </button>

          <p className="text-text-muted/60 text-xs mt-4">Redirecting to login…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden py-8"
      style={{ background: 'var(--color-bg-base)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md mx-4">
        <div className="rounded-2xl border p-8"
          style={{
            background: 'rgba(15, 30, 51, 0.88)',
            borderColor: 'var(--color-border-subtle)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
          }}>
          <div className="flex flex-col items-center mb-7">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-500 to-cyan-400 flex items-center justify-center text-white font-bold text-2xl mb-4 shadow-lg"
              style={{ boxShadow: '0 0 30px rgba(59,130,246,0.4)' }}>A</div>
            <h1 className="text-2xl font-bold text-white">Create your account</h1>
            <p className="text-text-muted text-sm mt-1">Start simulating for free</p>
          </div>

          {/* Google */}
          <button type="button" onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-border-subtle text-text-main text-sm font-medium hover:bg-white/5 transition-all duration-200 mb-5">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Sign up with Google
          </button>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-subtle" /></div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 text-text-muted" style={{ background: 'rgba(15,30,51,0.88)' }}>or with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Full Name */}
            <InputField label="Full Name" type="text" value={fullName} onChange={setFullName} placeholder="Ada Lovelace" icon={<User size={15} />} />
            <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@university.edu" icon={<Mail size={15} />} />

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Password</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"><Lock size={15} /></div>
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full bg-bg-base border border-border-subtle rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-text-muted/50 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors">
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <InputField label="Confirm Password" type="password" value={confirm} onChange={setConfirm} placeholder="Repeat password" icon={<Lock size={15} />} />

            {/* Role */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">I am a…</label>
              <div className="grid grid-cols-2 gap-2">
                {(['student', 'instructor'] as const).map(r => (
                  <button key={r} type="button" onClick={() => setRole(r)}
                    className={`py-2 rounded-xl text-sm font-medium border transition-all ${role === r ? 'bg-brand-500/15 border-brand-500/50 text-brand-400' : 'border-border-subtle text-text-muted hover:bg-white/5'}`}>
                    {r === 'student' ? '🎓 Student' : '👩‍🏫 Instructor'}
                  </button>
                ))}
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={() => setAgreed(!agreed)} className="sr-only" />
              <div
                className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center shrink-0 transition-all cursor-pointer ${agreed ? 'bg-brand-500 border-brand-500' : 'border-border-subtle'}`}>
                {agreed && <span className="text-white text-[10px] font-bold">✓</span>}
              </div>
              <span className="text-xs text-text-muted leading-relaxed">
                I agree to the <span className="text-brand-400 cursor-pointer hover:underline" onClick={(e) => { e.preventDefault(); alert('Terms of Service: By using ArchSim, you agree to use it for educational purposes. This is a student project.'); }}>Terms of Service</span> and <span className="text-brand-400 cursor-pointer hover:underline" onClick={(e) => { e.preventDefault(); alert('Privacy Policy: ArchSim collects minimal data necessary for authentication. Your simulation data is stored locally. We do not share your information with third parties.'); }}>Privacy Policy</span>
              </span>
            </label>

            {displayError && (
              <div className="rounded-lg px-3 py-2.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20">{displayError}</div>
            )}

            {/* Cloudflare Turnstile CAPTCHA — invisible unless interaction needed */}
            <Turnstile
              onVerify={handleCaptchaVerify}
              onExpire={handleCaptchaExpire}
              resetKey={captchaResetKey}
            />

            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', boxShadow: '0 0 20px rgba(59,130,246,0.35)' }}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-text-muted text-sm mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const InputField = ({ label, type, value, onChange, placeholder, icon }: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string; icon: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-medium text-text-muted uppercase tracking-wider">{label}</label>
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">{icon}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-bg-base border border-border-subtle rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-text-muted/50 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all" />
    </div>
  </div>
);
