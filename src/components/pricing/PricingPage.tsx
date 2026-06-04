import { motion } from 'framer-motion';
import { Check, Shield, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export const PricingPage = () => {
  const navigate = useNavigate();
  const { profile, upgradePlan } = useAuthStore();
  const [showCheckout, setShowCheckout] = useState(false);

  return (
    <div className="min-h-screen bg-bg-base text-text-main py-20 px-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 opacity-30 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top, #3b82f6 0%, transparent 60%)' }} />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            Level up your <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-cyan-300">architectural</span> workflow.
          </h1>
          <p className="text-lg text-text-muted">
            Whether you're struggling through CS301 or teaching a full cohort, we have a plan for you.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
          
          {/* Free Tier */}
          <PlanCard
            name="Student"
            price="$0"
            description="Perfect for passing your intro to architecture class."
            features={[
              '3 active projects',
              'Visual pipeline simulator',
              'Basic hazard detection',
              'Community support',
            ]}
            cta="Get Started Free"
            onClick={() => navigate('/register')}
            current={profile?.plan === 'free'}
          />

          {/* Pro Tier */}
          <div className="relative">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-b from-brand-500 to-cyan-500 opacity-30 blur-lg" />
            <PlanCard
              name="Pro"
              price="$8"
              interval="/mo"
              badge="MOST POPULAR"
              description="Unlock the full power of visual debugging and optimization."
              features={[
                'Unlimited projects',
                'Datapath & Timing views',
                'Advanced forwarding logic',
                'Custom ISA extensions (coming soon)',
                'Priority email support',
              ]}
              cta={profile?.plan === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
              highlight
              onClick={() => setShowCheckout(true)}
              current={profile?.plan === 'pro'}
            />
          </div>

          {/* Institution Tier */}
          <PlanCard
            name="Institution"
            price="$29"
            interval="/seat/mo"
            description="Equip your entire class with an interactive teaching tool."
            features={[
              'Canvas / LTI integration',
              'Auto-grading assignments',
              'Cohort performance heatmaps',
              'Single Sign-On (SSO)',
              'Dedicated success manager',
            ]}
            cta="Contact Sales"
            onClick={() => window.open('mailto:sales@archsim.edu')}
            current={profile?.plan === 'institution'}
          />
        </div>
      </div>

      {showCheckout && (
        <CheckoutModal 
          onClose={() => setShowCheckout(false)} 
          onSuccess={async () => {
            await upgradePlan('pro');
            setShowCheckout(false);
            navigate('/settings');
          }} 
        />
      )}
    </div>
  );
};

const PlanCard = ({ name, price, interval, description, features, cta, highlight, badge, onClick, current }: any) => (
  <div className={`relative flex flex-col p-8 rounded-3xl border h-full transition-transform duration-300 hover:-translate-y-1
    ${highlight ? 'bg-bg-surface border-brand-500/50 shadow-2xl shadow-brand-500/10' : 'bg-bg-panel border-border-subtle'}`}
  >
    {badge && (
      <div className="absolute top-0 right-8 -translate-y-1/2">
        <span className="bg-gradient-to-r from-brand-500 to-cyan-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
          {badge}
        </span>
      </div>
    )}
    
    <h3 className="text-xl font-bold text-white mb-2">{name}</h3>
    <p className="text-text-muted text-sm min-h-[40px] mb-6">{description}</p>
    
    <div className="flex items-baseline gap-1 mb-8">
      <span className="text-4xl font-bold text-white">{price}</span>
      {interval && <span className="text-text-muted">{interval}</span>}
    </div>

    <button 
      onClick={onClick}
      disabled={current}
      className={`w-full py-3 rounded-xl font-semibold transition-all mb-8 flex items-center justify-center gap-2
        ${current ? 'bg-white/5 text-text-muted cursor-not-allowed' :
          highlight 
          ? 'bg-brand-500 text-white hover:bg-brand-400 shadow-lg shadow-brand-500/25' 
          : 'bg-white text-bg-base hover:bg-gray-200'}`}
    >
      {current ? 'Current Plan' : cta}
      {!current && <ArrowRight size={16} />}
    </button>

    <div className="flex flex-col gap-4 mt-auto">
      {features.map((f: string) => (
        <div key={f} className="flex items-start gap-3">
          <Check size={18} className={highlight ? 'text-cyan-400' : 'text-brand-500'} />
          <span className="text-sm text-text-main">{f}</span>
        </div>
      ))}
    </div>
  </div>
);

const CheckoutModal = ({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) => {
  const [loading, setLoading] = useState(false);

  const simulatePayment = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSuccess();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-bg-surface border border-border-subtle rounded-2xl p-6 shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-white">✕</button>
        
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white mb-1">Upgrade to Pro</h2>
          <p className="text-sm text-text-muted">You will be charged $8.00 immediately.</p>
        </div>

        {/* Mock Card Form */}
        <div className="space-y-4 mb-8">
          <div className="space-y-1.5">
            <label className="text-xs text-text-muted uppercase">Card Information</label>
            <div className="border border-border-subtle rounded-lg overflow-hidden bg-bg-base">
              <input type="text" placeholder="Card number" className="w-full bg-transparent px-3 py-2.5 text-sm text-white outline-none border-b border-border-subtle" />
              <div className="flex">
                <input type="text" placeholder="MM / YY" className="w-1/2 bg-transparent px-3 py-2.5 text-sm text-white outline-none border-r border-border-subtle" />
                <input type="text" placeholder="CVC" className="w-1/2 bg-transparent px-3 py-2.5 text-sm text-white outline-none" />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-text-muted uppercase">Cardholder Name</label>
            <input type="text" placeholder="Ada Lovelace" className="w-full bg-bg-base border border-border-subtle rounded-lg px-3 py-2.5 text-sm text-white outline-none" />
          </div>
        </div>

        <button 
          onClick={simulatePayment}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold transition-all hover:bg-brand-400 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>Pay $8.00</>
          )}
        </button>
        <p className="text-center text-xs text-text-muted mt-4 flex items-center justify-center gap-1">
          <Shield size={12} /> Secure mock checkout powered by imaginary Stripe
        </p>
      </motion.div>
    </div>
  );
};
