import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Link as LinkIcon, CheckCircle2, AlertCircle, Database, Globe } from 'lucide-react';
import { generateShareURL, shareToSupabase, generateSupabaseShareURL } from '../../engine/permalinkEncoder';
import { useSimulatorStore } from '../../store/simulatorStore';
import { useAuthStore } from '../../store/authStore';

export const ShareDialog = ({ onClose }: { onClose: () => void }) => {
  const { code, forwardingEnabled, branchPrediction, isa } = useSimulatorStore();
  const { profile } = useAuthStore();
  
  const [mode, setMode] = useState<'url' | 'supabase'>('url');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate URL mode on load
  useEffect(() => {
    if (mode === 'url') {
      const url = generateShareURL(code, {
        forwarding: forwardingEnabled,
        branchPrediction,
        isa,
      });
      setShareUrl(url);
    }
  }, [mode, code, forwardingEnabled, branchPrediction, isa]);

  const handleGenerateSupabase = async () => {
    if (!profile) {
      setError('You must be logged in to create a persistent share link.');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    const { shareId, error: shareErr } = await shareToSupabase(code, profile.id, {
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      forwarding: forwardingEnabled,
      branchPrediction,
      isa,
    });
    
    if (shareErr) {
      setError(shareErr);
    } else if (shareId) {
      setShareUrl(generateSupabaseShareURL(shareId));
    }
    
    setIsGenerating(false);
  };

  const copyToClipboard = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/60 pointer-events-auto" onClick={onClose} />
      
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="relative bg-bg-surface border border-border-subtle shadow-2xl rounded-2xl w-[480px] pointer-events-auto overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
            <h2 className="text-white font-bold flex items-center gap-2">
              <Share2 size={18} className="text-brand-400" />
              Share Project
            </h2>
            <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Mode toggle */}
            <div className="flex bg-bg-base p-1 rounded-lg">
              <button
                onClick={() => setMode('url')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all ${
                  mode === 'url' ? 'bg-bg-panel text-white shadow-sm' : 'text-text-muted hover:text-white'
                }`}
              >
                <LinkIcon size={14} /> URL-Encoded
              </button>
              <button
                onClick={() => { setMode('supabase'); setShareUrl(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all ${
                  mode === 'supabase' ? 'bg-brand-500/15 text-brand-400 shadow-sm' : 'text-text-muted hover:text-white'
                }`}
              >
                <Database size={14} /> Persistent Link
              </button>
            </div>

            {/* Mode content */}
            {mode === 'url' ? (
              <div className="space-y-4">
                <p className="text-xs text-text-muted leading-relaxed">
                  The code and settings are compressed directly into the URL. No backend is used. This is great for short programs but the URL can become very long for large files.
                </p>
                {shareUrl.length > 2000 && (
                  <div className="px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-2">
                    <AlertCircle size={14} className="text-yellow-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-yellow-400">Warning: This URL is {shareUrl.length} characters long. Some browsers or chat apps may truncate it. Consider using a Persistent Link instead.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-text-muted leading-relaxed">
                  Your code is saved to the database. The generated link will be short and clean. You must be logged in to create a persistent link.
                </p>
                
                {!shareUrl && (
                  <>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Title (optional)"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-bg-base border border-border-subtle rounded-lg text-white text-sm focus:border-brand-500 focus:outline-none transition-colors"
                      />
                      <textarea
                        placeholder="Description / Instructions (optional)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-bg-base border border-border-subtle rounded-lg text-white text-sm focus:border-brand-500 focus:outline-none transition-colors resize-none"
                      />
                    </div>
                    
                    <button
                      onClick={handleGenerateSupabase}
                      disabled={isGenerating || !profile}
                      className="w-full py-2.5 bg-brand-500 hover:bg-brand-400 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isGenerating ? 'Generating...' : 'Generate Link'}
                      <Globe size={16} />
                    </button>
                    {!profile && (
                      <p className="text-xs text-red-400 text-center">Please log in to create a persistent link.</p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* URL Output */}
            {shareUrl && (
              <div className="space-y-2 mt-6">
                <label className="text-xs font-bold text-white">Your Share Link</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 px-3 py-2 bg-bg-base border border-border-subtle rounded-lg text-text-muted text-xs font-mono truncate focus:outline-none"
                  />
                  <button
                    onClick={copyToClipboard}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      copied
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {copied ? <CheckCircle2 size={14} /> : <LinkIcon size={14} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
