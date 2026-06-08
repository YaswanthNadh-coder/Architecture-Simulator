import { useState } from 'react';
import { Settings, User, Monitor, CreditCard, AlertTriangle, Receipt, Shield, Sparkles, Clock, Download } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { useNavigate } from 'react-router-dom';
import { formatBillingDate, getTierDisplayName, formatPrice, getProPrice } from '../../lib/billingUtils';
import { BillingHistory } from './BillingHistory';
import { CancelSubscriptionModal } from './CancelSubscriptionModal';

export const SettingsPage = () => {
  const { profile } = useAuthStore();
  const {
    tier, status, billingInterval, currentPeriodEnd, cancelAtPeriodEnd,
    isStudentDiscount, getTrialDaysRemaining, isTrialActive,
  } = useSubscriptionStore();
  const navigate = useNavigate();
  const [fontSize, setFontSize] = useState('14px');
  const [showCancel, setShowCancel] = useState(false);
  const [showBilling, setShowBilling] = useState(false);

  const isPaid = tier === 'pro' || tier === 'institution' || tier === 'enterprise';
  const trialDays = getTrialDaysRemaining();

  return (
    <div className="flex-1 overflow-auto bg-bg-base p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
          <Settings className="text-text-muted" /> Settings
        </h1>

        <div className="space-y-8">
          {/* Profile Section */}
          <section className="bg-bg-surface border border-border-subtle rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User size={18} className="text-brand-500" /> Profile
            </h2>
            <div className="flex items-center gap-6 mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-500 to-cyan-400 flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                {profile?.full_name?.charAt(0) || 'A'}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{profile?.full_name || 'Anonymous User'}</h3>
                <p className="text-text-muted capitalize">{profile?.role || 'Student'}</p>
              </div>
            </div>
          </section>

          {/* Subscription Section */}
          <section className="bg-bg-surface border border-border-subtle rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CreditCard size={18} className="text-cyan-500" /> Subscription
            </h2>

            {/* Current plan card */}
            <div className="p-5 bg-bg-panel rounded-xl border border-border-subtle mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Current Plan</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-white">{getTierDisplayName(tier)}</span>
                    {isPaid && status === 'active' && (
                      <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-emerald-500/20">
                        ACTIVE
                      </span>
                    )}
                    {status === 'trialing' && (
                      <span className="bg-brand-500/10 text-brand-400 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-brand-500/20">
                        TRIAL
                      </span>
                    )}
                    {status === 'past_due' && (
                      <span className="bg-hazard/10 text-hazard text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-hazard/20">
                        PAST DUE
                      </span>
                    )}
                    {cancelAtPeriodEnd && (
                      <span className="bg-yellow-500/10 text-yellow-400 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-yellow-500/20">
                        CANCELING
                      </span>
                    )}
                    {isStudentDiscount && (
                      <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-emerald-500/20">
                        STUDENT
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => navigate('/pricing')}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold rounded-xl transition-colors border border-white/10"
                >
                  {tier === 'free' ? 'Upgrade' : 'Change Plan'}
                </button>
              </div>

              {/* Billing details */}
              {isPaid && billingInterval && (
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border-subtle/50">
                  <div>
                    <p className="text-xs text-text-muted mb-0.5">Billing</p>
                    <p className="text-sm text-white font-medium capitalize">
                      {billingInterval} — {formatPrice(getProPrice(billingInterval, isStudentDiscount))}
                    </p>
                  </div>
                  {currentPeriodEnd && (
                    <div>
                      <p className="text-xs text-text-muted mb-0.5">
                        {cancelAtPeriodEnd ? 'Access until' : 'Next billing'}
                      </p>
                      <p className="text-sm text-white font-medium flex items-center gap-1.5">
                        <Clock size={12} className="text-text-muted" />
                        {formatBillingDate(currentPeriodEnd)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Trial info */}
              {isTrialActive() && (
                <div className="mt-4 pt-4 border-t border-border-subtle/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-brand-400" />
                      <p className="text-sm text-white">
                        <span className="font-bold">{trialDays}</span> days left in your Pro trial
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/pricing')}
                      className="text-xs text-brand-400 font-semibold hover:text-brand-300 transition-colors"
                    >
                      Upgrade Now →
                    </button>
                  </div>
                  <div className="mt-2 w-full h-1.5 bg-bg-base rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-500 to-cyan-400 rounded-full transition-all"
                      style={{ width: `${Math.max(5, ((14 - trialDays) / 14) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Payment method */}
              {isPaid && status === 'active' && (
                <div className="mt-4 pt-4 border-t border-border-subtle/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-text-muted" />
                    <p className="text-xs text-text-muted">Payment method</p>
                    <span className="text-xs text-white font-mono">•••• 4242</span>
                  </div>
                  <button className="text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium">
                    Update
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            {isPaid && !cancelAtPeriodEnd && (
              <button
                onClick={() => setShowCancel(true)}
                className="text-xs text-text-muted hover:text-hazard transition-colors"
              >
                Cancel subscription
              </button>
            )}
            {cancelAtPeriodEnd && (
              <p className="text-xs text-yellow-400/70">
                Your subscription will end on {currentPeriodEnd ? formatBillingDate(currentPeriodEnd) : 'your billing period end'}.
                You can re-subscribe at any time.
              </p>
            )}
          </section>

          {/* Billing History */}
          {isPaid && (
            <section className="bg-bg-surface border border-border-subtle rounded-2xl p-6">
              <button
                onClick={() => setShowBilling(!showBilling)}
                className="w-full flex items-center justify-between"
              >
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Receipt size={18} className="text-brand-500" /> Billing History
                </h2>
                <span className="text-xs text-text-muted">{showBilling ? 'Hide' : 'Show'}</span>
              </button>
              {showBilling && (
                <div className="mt-4">
                  <BillingHistory />
                </div>
              )}
            </section>
          )}

          {/* Data & Privacy */}
          <section className="bg-bg-surface border border-border-subtle rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Download size={18} className="text-emerald-500" /> Data & Privacy
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-text-main">Export your data</p>
                  <p className="text-xs text-text-muted">Download all programs, execution history, and settings as JSON.</p>
                </div>
                <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold rounded-xl transition-colors border border-white/10">
                  Export
                </button>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border-subtle">
                <div>
                  <p className="text-sm text-text-main">Request data deletion</p>
                  <p className="text-xs text-text-muted">All personal data will be removed within 30 days per GDPR.</p>
                </div>
                <button className="px-4 py-2 bg-hazard/5 hover:bg-hazard/10 text-hazard text-sm font-semibold rounded-xl transition-colors border border-hazard/20">
                  Request
                </button>
              </div>
            </div>
          </section>

          {/* Editor Preferences */}
          <section className="bg-bg-surface border border-border-subtle rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Monitor size={18} className="text-emerald-500" /> Editor Preferences
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-text-main">Font Size</span>
                <select value={fontSize} onChange={(e) => setFontSize(e.target.value)} className="bg-bg-panel border border-border-subtle text-white rounded-lg px-3 py-1 outline-none">
                  <option value="12px">12px</option>
                  <option value="14px">14px</option>
                  <option value="16px">16px</option>
                  <option value="18px">18px</option>
                </select>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border-subtle">
                <span className="text-text-main">Theme</span>
                <span className="text-text-muted text-sm italic">Always Dark</span>
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="bg-hazard/5 border border-hazard/20 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-hazard mb-2 flex items-center gap-2">
              <AlertTriangle size={18} /> Danger Zone
            </h2>
            <p className="text-text-muted text-sm mb-4">Permanently delete your account and all associated projects. This cannot be undone.</p>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                  alert('Account deletion requested. This feature requires a connected backend.');
                }
              }}
              className="px-4 py-2 bg-hazard/10 hover:bg-hazard/20 text-hazard text-sm font-semibold rounded-xl transition-colors border border-hazard/30"
            >
              Delete Account
            </button>
          </section>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancel && <CancelSubscriptionModal onClose={() => setShowCancel(false)} />}
    </div>
  );
};
