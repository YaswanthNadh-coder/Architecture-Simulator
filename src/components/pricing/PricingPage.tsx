import { motion } from 'framer-motion';
import { Zap, GraduationCap, Clock, ShieldCheck, Cpu, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PricingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 h-full w-full overflow-y-auto bg-bg-base text-text-main relative custom-scrollbar flex items-center justify-center p-6 md:p-12">
      {/* Dynamic Background Glow Effects */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[450px] opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, #3b82f6 0%, #06b6d4 40%, transparent 70%)' }} 
      />

      <div className="max-w-3xl w-full mx-auto relative z-10 text-center space-y-8 my-auto py-12">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-bold uppercase tracking-wider shadow-xl shadow-brand-500/10"
        >
          <Clock size={14} className="animate-spin text-brand-400" style={{ animationDuration: '4s' }} /> 
          Pricing & Subscriptions — Coming Soon
        </motion.div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-4"
        >
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
            100% Free Access <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-cyan-300 to-emerald-400">
              For All Users Right Now.
            </span>
          </h1>
          
          <p className="text-base md:text-lg text-text-muted max-w-xl mx-auto leading-relaxed">
            We are building Architecture Simulator in public! Paid tiers and premium subscriptions will launch in the future. For now, enjoy unrestricted access to every tool and module.
          </p>
        </motion.div>

        {/* Unlocked Features Preview Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-2"
        >
          <div className="bg-bg-surface/80 border border-border-subtle p-4 rounded-2xl flex items-start gap-3 shadow-lg">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 shrink-0">
              <Zap size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white mb-0.5">Multi-Level L1/L2/L3 Cache</h3>
              <p className="text-[11px] text-text-muted">Full hierarchy simulation with AMAT & replacement policies.</p>
            </div>
          </div>

          <div className="bg-bg-surface/80 border border-border-subtle p-4 rounded-2xl flex items-start gap-3 shadow-lg">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0">
              <Cpu size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white mb-0.5">MIPS & RISC-V Support</h3>
              <p className="text-[11px] text-text-muted">Simulate both classic 5-stage MIPS I and RV32I ISAs.</p>
            </div>
          </div>

          <div className="bg-bg-surface/80 border border-border-subtle p-4 rounded-2xl flex items-start gap-3 shadow-lg">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white mb-0.5">Branch Predictor & BHT</h3>
              <p className="text-[11px] text-text-muted">Predict-not-taken, always-taken, and branch target buffer.</p>
            </div>
          </div>

          <div className="bg-bg-surface/80 border border-border-subtle p-4 rounded-2xl flex items-start gap-3 shadow-lg">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
              <GraduationCap size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white mb-0.5">Professor Tools & Auto-Grader</h3>
              <p className="text-[11px] text-text-muted">Create assignments, run batch grading, and check plagiarism.</p>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="pt-4 flex flex-wrap items-center justify-center gap-4"
        >
          <button
            onClick={() => navigate('/simulator')}
            className="px-7 py-3.5 bg-gradient-to-r from-brand-500 to-cyan-500 hover:from-brand-400 hover:to-cyan-400 text-white font-bold text-sm rounded-xl shadow-xl shadow-brand-500/25 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
          >
            <Zap size={16} /> Open Simulator <ArrowRight size={14} />
          </button>

          <button
            onClick={() => navigate('/learn')}
            className="px-7 py-3.5 bg-white/5 hover:bg-white/10 text-white font-semibold text-sm rounded-xl border border-white/10 transition-all flex items-center gap-2 cursor-pointer"
          >
            <GraduationCap size={16} /> Interactive Course
          </button>
        </motion.div>
      </div>
    </div>
  );
};
