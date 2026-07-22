import { Settings, User, Monitor, Download, AlertTriangle, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useNavigate, Link } from 'react-router-dom';

export const SettingsPage = () => {
  const { profile } = useAuthStore();
  const { fontSize, setFontSize } = useSettingsStore();
  const navigate = useNavigate();

  const handleExport = () => {
    const data = {
      profile: profile,
      simulatorState: JSON.parse(localStorage.getItem('archsim_simulator_storage') || '{}'),
      tutorialProgress: JSON.parse(localStorage.getItem('archsim_tutorial_progress') || '{}'),
      settings: JSON.parse(localStorage.getItem('archsim_settings') || '{}'),
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `archsim_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-bg-base p-8 pb-32 custom-scrollbar">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
          <Settings className="text-text-muted" /> Settings
        </h1>

        <div className="space-y-8">
          {/* Profile Section — conditional on sign-in state */}
          <section className="bg-bg-surface border border-border-subtle rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User size={18} className="text-brand-500" /> Profile
            </h2>
            {profile ? (
              <div className="flex items-center gap-6 mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-500 to-cyan-400 flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                  {profile?.full_name?.charAt(0) || 'A'}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">{profile?.full_name || 'Anonymous User'}</h3>
                  <p className="text-text-muted capitalize">{profile?.role || 'Student'}</p>
                </div>
                <button
                  onClick={async () => {
                    await useAuthStore.getState().logout();
                    navigate('/');
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold rounded-xl transition-colors border border-white/10 flex items-center gap-2"
                >
                  <LogOut size={16} /> Log Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-bg-panel border border-border-subtle flex items-center justify-center">
                  <User size={32} className="text-text-muted" />
                </div>
                <div>
                  <p className="text-white font-semibold">Not signed in</p>
                  <Link to="/login" className="text-brand-400 text-sm hover:underline">Sign in to save progress across devices →</Link>
                </div>
              </div>
            )}
          </section>

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
                <button 
                  onClick={handleExport}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold rounded-xl transition-colors border border-white/10"
                >
                  Export
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
    </div>
  );
};
