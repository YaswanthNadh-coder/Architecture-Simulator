import { useState } from 'react';
import { Settings, User, Monitor, CreditCard, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

export const SettingsPage = () => {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [fontSize, setFontSize] = useState('14px');

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
            <div className="flex items-center justify-between p-4 bg-bg-panel rounded-xl border border-border-subtle">
              <div>
                <p className="text-sm text-text-muted uppercase tracking-wider mb-1">Current Plan</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-white capitalize">{profile?.plan || 'Free'}</span>
                  {profile?.plan === 'pro' && (
                    <span className="bg-gradient-to-r from-brand-500 to-cyan-500 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded shadow">ACTIVE</span>
                  )}
                </div>
              </div>
              <button onClick={() => navigate('/pricing')} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold rounded-xl transition-colors border border-white/10">
                Manage Plan
              </button>
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
    </div>
  );
};
