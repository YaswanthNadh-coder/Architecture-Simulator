import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, ArrowRight, CheckCircle2, XCircle, Cpu, GitBranch,
  Shield, BarChart3, GraduationCap, Zap, Eye,
  ChevronDown, Code2, Mail, Layers, Terminal
} from 'lucide-react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';

// ── Mini Simulator Demo ─────────────────────────────────────────────────────
// A lightweight embedded demo that shows the pipeline in action without signup.

const DEMO_PROGRAM = `# Fibonacci — first 8 numbers
addi $t0, $zero, 0    # fib(0) = 0
addi $t1, $zero, 1    # fib(1) = 1
addi $t3, $zero, 8    # count
addi $t4, $zero, 0    # i = 0

loop:
  beq  $t4, $t3, done
  add  $t2, $t0, $t1  # next = a + b
  add  $t0, $t1, $zero # a = b
  add  $t1, $t2, $zero # b = next
  addi $t4, $t4, 1
  j    loop

done:
# $t1 = 21 (8th Fibonacci)`;

const DEMO_STAGES = ['IF', 'ID', 'EX', 'MEM', 'WB'];
const STAGE_COLORS: Record<string, string> = {
  IF: '#3b82f6',
  ID: '#8b5cf6',
  EX: '#f59e0b',
  MEM: '#10b981',
  WB: '#ef4444',
};

function MiniSimulator() {
  const [cycle, setCycle] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const maxCycles = 12;

  const instructions = DEMO_PROGRAM.split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('#') && !l.trim().endsWith(':'))
    .map(l => l.split('#')[0].trim())
    .filter(Boolean);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCycle(c => (c + 1) % (maxCycles + 5));
      }, 600);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying]);

  return (
    <div className="bg-[#0d1117] rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-blue-500/5">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-[11px] text-white/40 font-mono ml-2">pipeline_simulator.asm</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-blue-400/80">Cycle {cycle}</span>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
        </div>
      </div>

      {/* Split view: Code + Pipeline */}
      <div className="flex divide-x divide-white/10" style={{ minHeight: 280 }}>
        {/* Code panel */}
        <div className="flex-1 p-4 font-mono text-[11px] leading-[1.8] overflow-hidden">
          {DEMO_PROGRAM.split('\n').map((line, i) => {
            const isComment = line.trim().startsWith('#');
            const isLabel = line.trim().endsWith(':');
            const isActive = !isComment && !isLabel && line.trim().length > 0;
            const instrIndex = instructions.indexOf(line.split('#')[0].trim());
            const isCurrentlyInPipeline = isActive && instrIndex >= 0 && instrIndex <= cycle && instrIndex > cycle - 5;

            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-2 -mx-2 rounded transition-colors ${
                  isCurrentlyInPipeline ? 'bg-blue-500/10' : ''
                }`}
              >
                <span className="w-5 text-right text-white/15 select-none shrink-0">{i + 1}</span>
                <span className={
                  isComment ? 'text-green-400/50' :
                  isLabel ? 'text-purple-400' :
                  isCurrentlyInPipeline ? 'text-white' : 'text-white/60'
                }>
                  {line || ' '}
                </span>
              </div>
            );
          })}
        </div>

        {/* Pipeline diagram */}
        <div className="w-[320px] p-4 shrink-0">
          <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-3">Pipeline Stages</div>
          
          {/* Stage headers */}
          <div className="flex gap-1 mb-2">
            {DEMO_STAGES.map(s => (
              <div key={s} className="flex-1 text-center text-[9px] font-bold tracking-wider" style={{ color: STAGE_COLORS[s] }}>
                {s}
              </div>
            ))}
          </div>

          {/* Pipeline grid */}
          <div className="space-y-1">
            {instructions.slice(0, 8).map((_, instrIdx) => {
              const stageInCycle = cycle - instrIdx;
              return (
                <div key={instrIdx} className="flex gap-1">
                  {DEMO_STAGES.map((stage, stageIdx) => {
                    const isActive = stageInCycle === stageIdx && stageInCycle >= 0 && stageInCycle < 5;
                    return (
                      <motion.div
                        key={stageIdx}
                        className="flex-1 h-6 rounded-sm flex items-center justify-center text-[8px] font-bold"
                        animate={{
                          backgroundColor: isActive ? STAGE_COLORS[stage] + '30' : 'rgba(255,255,255,0.02)',
                          borderColor: isActive ? STAGE_COLORS[stage] + '50' : 'rgba(255,255,255,0.05)',
                        }}
                        style={{ border: '1px solid' }}
                        transition={{ duration: 0.2 }}
                      >
                        {isActive && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{ color: STAGE_COLORS[stage] }}
                          >
                            {stage}
                          </motion.span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: 'CPI', value: '1.25' },
              { label: 'Stalls', value: cycle > 3 ? '2' : '0' },
              { label: 'IPC', value: '0.80' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/[0.03] rounded-lg p-2 text-center border border-white/5">
                <div className="text-[9px] text-white/30 uppercase font-bold">{stat.label}</div>
                <div className="text-sm font-bold text-white font-mono">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Comparison Table ─────────────────────────────────────────────────────────

interface ComparisonRow {
  feature: string;
  us: boolean | string;
  competitor: boolean | string;
}

const COMPARISON_DATA: ComparisonRow[] = [
  { feature: 'Interactive Pipeline Visualization', us: true, competitor: false },
  { feature: 'Forwarding On/Off Comparison (Diff View)', us: true, competitor: false },
  { feature: 'Branch Prediction Simulator', us: true, competitor: false },
  { feature: 'Cache Simulation with Hit/Miss Tracking', us: true, competitor: 'Basic' },
  { feature: 'Datapath Animation', us: true, competitor: false },
  { feature: 'Auto-Grading with Hidden Tests', us: true, competitor: true },
  { feature: 'Structural Plagiarism Detection', us: true, competitor: false },
  { feature: 'RISC-V Support', us: true, competitor: false },
  { feature: 'Real-time Timing Diagrams', us: true, competitor: false },
  { feature: 'Curriculum Labs (15 P&H labs)', us: true, competitor: false },
  { feature: 'LMS Integration (Canvas/Moodle)', us: 'Coming', competitor: true },
  { feature: 'Price for Students', us: 'Free', competitor: 'Paid' },
];

function ComparisonTable() {
  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <div className="grid grid-cols-[1fr_120px_120px] bg-white/[0.03]">
        <div className="px-5 py-3 text-[10px] text-white/40 uppercase tracking-widest font-bold">Feature</div>
        <div className="px-5 py-3 text-[10px] text-blue-400 uppercase tracking-widest font-bold text-center">ArchSim</div>
        <div className="px-5 py-3 text-[10px] text-white/40 uppercase tracking-widest font-bold text-center">Others</div>
      </div>
      {COMPARISON_DATA.map((row, i) => (
        <div
          key={i}
          className={`grid grid-cols-[1fr_120px_120px] border-t border-white/5 ${
            i % 2 === 0 ? 'bg-white/[0.01]' : ''
          }`}
        >
          <div className="px-5 py-3 text-sm text-white/80">{row.feature}</div>
          <div className="px-5 py-3 flex items-center justify-center">
            {row.us === true ? (
              <CheckCircle2 size={16} className="text-emerald-400" />
            ) : row.us === false ? (
              <XCircle size={16} className="text-red-400/50" />
            ) : (
              <span className="text-xs text-blue-400 font-semibold">{row.us}</span>
            )}
          </div>
          <div className="px-5 py-3 flex items-center justify-center">
            {row.competitor === true ? (
              <CheckCircle2 size={16} className="text-emerald-400/50" />
            ) : row.competitor === false ? (
              <XCircle size={16} className="text-red-400/30" />
            ) : (
              <span className="text-xs text-white/40 font-semibold">{row.competitor}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Feature Card ─────────────────────────────────────────────────────────────

function FeatureCard({
  icon, title, description, delay = 0
}: {
  icon: React.ReactNode; title: string; description: string; delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 hover:border-blue-500/30 hover:bg-white/[0.04] transition-all group"
    >
      <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-white font-bold text-base mb-2">{title}</h3>
      <p className="text-white/50 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}

// ── Pricing Card ─────────────────────────────────────────────────────────────

function PricingCard({
  name, price, period, features, highlight = false, cta, onCta
}: {
  name: string; price: string; period: string;
  features: string[]; highlight?: boolean;
  cta: string; onCta: () => void;
}) {
  return (
    <div className={`rounded-2xl p-6 border flex flex-col ${
      highlight
        ? 'bg-blue-500/5 border-blue-500/30 ring-1 ring-blue-500/20'
        : 'bg-white/[0.02] border-white/10'
    }`}>
      {highlight && (
        <span className="text-[10px] uppercase tracking-widest font-bold text-blue-400 mb-3">Most Popular</span>
      )}
      <h3 className="text-white font-bold text-lg">{name}</h3>
      <div className="mt-2 mb-5">
        <span className="text-3xl font-black text-white">{price}</span>
        {period && <span className="text-white/40 text-sm ml-1">{period}</span>}
      </div>
      <ul className="space-y-2.5 mb-6 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-white/70">
            <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={onCta}
        className={`w-full py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
          highlight
            ? 'bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/25'
            : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
        }`}
      >
        {cta}
      </button>
    </div>
  );
}

// ── Main Landing Page ────────────────────────────────────────────────────────

export const LandingPage = () => {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.15], [0, -60]);

  return (
    <div className="min-h-screen bg-[#080b12] text-white overflow-x-hidden">
      {/* ─── Nav ─── */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#080b12]/80 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <Cpu size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">ArchSim</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#demo" className="hover:text-white transition-colors">Demo</a>
            <a href="#comparison" className="hover:text-white transition-colors">Compare</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              Log in
            </button>
            <button
              onClick={() => navigate('/register')}
              className="text-sm bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg font-semibold transition-colors cursor-pointer shadow-lg shadow-blue-500/20"
            >
              Start free
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, y: heroY }}
        className="relative pt-20 pb-8 px-6"
      >
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/8 blur-[120px] rounded-full" />
          <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-purple-500/5 blur-[100px] rounded-full" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-8">
              <Zap size={12} />
              Built for university computer architecture courses
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-6">
              The world's most{' '}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                visual
              </span>{' '}
              MIPS & RISC-V simulator
            </h1>

            <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
              Auto-grading, plagiarism detection, and a pipeline visualizer
              your students will actually remember. Free for students. Ready for institutions.
            </p>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => navigate('/register')}
                className="bg-blue-500 hover:bg-blue-400 text-white px-8 py-3.5 rounded-xl font-bold text-base flex items-center gap-2 transition-all shadow-xl shadow-blue-500/25 cursor-pointer"
              >
                <Play size={18} fill="currentColor" />
                Start free
              </button>
              <a
                href="#demo"
                className="bg-white/5 hover:bg-white/10 text-white px-8 py-3.5 rounded-xl font-bold text-base flex items-center gap-2 transition-all border border-white/10 cursor-pointer"
              >
                <Eye size={18} />
                Live demo
              </a>
            </div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="mt-16 flex justify-center"
          >
            <ChevronDown size={24} className="text-white/20" />
          </motion.div>
        </div>
      </motion.section>

      {/* ─── Live Demo ─── */}
      <section id="demo" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-black mb-4">See it in action</h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              A Fibonacci program running through the 5-stage pipeline. No signup required.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <MiniSimulator />
          </motion.div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section id="features" className="py-20 px-6 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-4">Everything professors need</h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              From pipeline visualization to auto-grading — built for teaching, not just simulating.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard
              icon={<Layers size={22} />}
              title="5-Stage Pipeline Visualizer"
              description="Watch instructions flow through IF, ID, EX, MEM, WB in real time. See stalls, forwarding, and flushes as they happen."
              delay={0}
            />
            <FeatureCard
              icon={<GitBranch size={22} />}
              title="Forwarding Diff View"
              description="Side-by-side comparison: forwarding ON vs OFF. Students see exactly how data bypassing eliminates stalls."
              delay={0.05}
            />
            <FeatureCard
              icon={<BarChart3 size={22} />}
              title="Branch Prediction Simulator"
              description="1-bit, 2-bit, always-taken, always-not-taken — visualize prediction tables, accuracy, and misprediction penalties."
              delay={0.1}
            />
            <FeatureCard
              icon={<Terminal size={22} />}
              title="Cache Simulation"
              description="Direct-mapped, set-associative, fully-associative. Track hits, misses, evictions, and write policies in real time."
              delay={0.15}
            />
            <FeatureCard
              icon={<GraduationCap size={22} />}
              title="Auto-Grading & Hidden Tests"
              description="Instructors create assignments with visible and hidden test cases. Server-side grading ensures students can't cheat."
              delay={0.2}
            />
            <FeatureCard
              icon={<Shield size={22} />}
              title="Plagiarism Detection"
              description="4-pass structural analysis: opcode LCS, register fingerprinting, control flow graph matching, and NOP-insertion detection."
              delay={0.25}
            />
          </div>
        </div>
      </section>

      {/* ─── Comparison ─── */}
      <section id="comparison" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-4">How we compare</h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              Built specifically for computer architecture education — not adapted from a general-purpose IDE.
            </p>
          </div>

          <ComparisonTable />
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-20 px-6 bg-white/[0.01]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-4">Simple, transparent pricing</h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              Free for students. Affordable for institutions. No hidden fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <PricingCard
              name="Free"
              price="$0"
              period="/forever"
              features={[
                'Full pipeline simulator',
                'MIPS & RISC-V support',
                '10 saved programs',
                'Basic analytics',
                '15 curriculum labs',
              ]}
              cta="Get started"
              onCta={() => navigate('/register')}
            />
            <PricingCard
              name="Pro"
              price="$8"
              period="/month"
              highlight
              features={[
                'Everything in Free',
                'Unlimited programs',
                'Cache simulation',
                'Step-back debugger',
                'Advanced analytics',
                'Timing diagram export',
              ]}
              cta="Start free trial"
              onCta={() => navigate('/register')}
            />
            <PricingCard
              name="Institution"
              price="Custom"
              period=""
              features={[
                'Everything in Pro',
                'Course management',
                'Auto-grading engine',
                'Plagiarism detection',
                'LMS integration',
                'SSO (SAML 2.0)',
                'Dedicated support',
              ]}
              cta="Request a demo"
              onCta={() => navigate('/register')}
            />
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Ready to transform your architecture course?
          </h2>
          <p className="text-white/50 text-lg mb-8 max-w-lg mx-auto">
            Join professors who are using visual simulation to teach pipelines, hazards, and caching.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="bg-blue-500 hover:bg-blue-400 text-white px-8 py-3.5 rounded-xl font-bold text-base flex items-center gap-2 transition-all shadow-xl shadow-blue-500/25 cursor-pointer"
            >
              Start free <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/5 py-12 px-6 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                  <Cpu size={14} className="text-white" />
                </div>
                <span className="font-bold">ArchSim</span>
              </div>
              <p className="text-xs text-white/30 leading-relaxed">
                The most visual MIPS & RISC-V simulator for university courses.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-white/40">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#demo" className="hover:text-white transition-colors">Demo</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Resources</h4>
              <ul className="space-y-2 text-sm text-white/40">
                <li><span className="cursor-pointer hover:text-white transition-colors" onClick={() => navigate('/learn')}>Curriculum Labs</span></li>
                <li><span className="cursor-pointer hover:text-white transition-colors">Documentation</span></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Connect</h4>
              <ul className="space-y-2 text-sm text-white/40">
                <li className="flex items-center gap-2"><Code2 size={14} /> <span>GitHub</span></li>
                <li className="flex items-center gap-2"><Mail size={14} /> <span>Contact</span></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex items-center justify-between">
            <span className="text-xs text-white/20">© {new Date().getFullYear()} Architecture Simulator. All rights reserved.</span>
            <div className="flex gap-4 text-xs text-white/20">
              <span className="hover:text-white/40 cursor-pointer transition-colors">Privacy</span>
              <span className="hover:text-white/40 cursor-pointer transition-colors">Terms</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
