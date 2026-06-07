import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Send, Check } from 'lucide-react';

interface InstitutionContactFormProps {
  type: 'institution' | 'enterprise';
  onClose: () => void;
}

export const InstitutionContactForm = ({ type, onClose }: InstitutionContactFormProps) => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    institution: '',
    role: '',
    seats: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would POST to an API
    setTimeout(() => setSubmitted(true), 800);
  };

  const title = type === 'enterprise' ? 'Contact Sales' : 'Start Institution Pilot';
  const subtitle = type === 'enterprise'
    ? 'Tell us about your training needs and we\'ll build a custom solution.'
    : 'Get your first semester free for up to 30 students with one instructor account.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-bg-surface border border-border-subtle rounded-2xl shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-white">✕</button>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                <Building2 size={20} className="text-brand-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{title}</h2>
                <p className="text-xs text-text-muted">{subtitle}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-text-muted uppercase tracking-wider">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
                    placeholder="Dr. Patterson"
                    className="w-full bg-bg-base border border-border-subtle rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500/50 transition-colors placeholder:text-text-muted/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-text-muted uppercase tracking-wider">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData(d => ({ ...d, email: e.target.value }))}
                    placeholder="prof@berkeley.edu"
                    className="w-full bg-bg-base border border-border-subtle rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500/50 transition-colors placeholder:text-text-muted/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-text-muted uppercase tracking-wider">Institution</label>
                <input
                  type="text"
                  required
                  value={formData.institution}
                  onChange={e => setFormData(d => ({ ...d, institution: e.target.value }))}
                  placeholder="UC Berkeley — CS Department"
                  className="w-full bg-bg-base border border-border-subtle rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500/50 transition-colors placeholder:text-text-muted/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-text-muted uppercase tracking-wider">Your Role</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData(d => ({ ...d, role: e.target.value }))}
                    className="w-full bg-bg-base border border-border-subtle rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500/50 transition-colors"
                  >
                    <option value="">Select...</option>
                    <option value="professor">Professor</option>
                    <option value="dept_chair">Department Chair</option>
                    <option value="it_admin">IT Administrator</option>
                    <option value="training_lead">Training Lead</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-text-muted uppercase tracking-wider">Est. Seats</label>
                  <input
                    type="number"
                    min="20"
                    value={formData.seats}
                    onChange={e => setFormData(d => ({ ...d, seats: e.target.value }))}
                    placeholder="100"
                    className="w-full bg-bg-base border border-border-subtle rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500/50 transition-colors placeholder:text-text-muted/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-text-muted uppercase tracking-wider">Anything else?</label>
                <textarea
                  rows={3}
                  value={formData.message}
                  onChange={e => setFormData(d => ({ ...d, message: e.target.value }))}
                  placeholder="Tell us about your courses, LMS setup, or specific needs..."
                  className="w-full bg-bg-base border border-border-subtle rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500/50 transition-colors resize-none placeholder:text-text-muted/50"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-400 transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2"
            >
              <Send size={16} />
              {type === 'enterprise' ? 'Request Demo' : 'Request Pilot Access'}
            </button>
          </form>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-12 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center"
            >
              <Check size={32} className="text-emerald-400" />
            </motion.div>
            <h2 className="text-xl font-bold text-white mb-2">Request received!</h2>
            <p className="text-text-muted text-sm mb-6">
              We'll reach out within 24 hours to schedule a walkthrough.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-white/5 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
            >
              Close
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
