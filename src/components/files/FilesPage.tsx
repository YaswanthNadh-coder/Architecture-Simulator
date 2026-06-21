import { useState, useCallback, useEffect } from 'react';
import { FileCode2, Plus, Clock, Trash2, FolderOpen, Lock, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { ProgramLimitGate } from '../monetization/ProgramLimitGate';
import { projectService } from '../../services/projectService';
import type { Project } from '../../lib/supabase';

const DEFAULT_CODE = `.data
  result: .word 0

.text
  main:
    addi $t0, $zero, 0    # counter
    addi $t1, $zero, 10   # limit
  loop:
    beq  $t0, $t1, done
    addi $t0, $t0, 1
    j    loop
  done:
    sw   $t0, result($zero)
`;

export const FilesPage = () => {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { capabilities, programCount } = useSubscriptionStore();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  // Fetch projects from Supabase on mount
  useEffect(() => {
    if (!profile) return;

    const loadProjects = async () => {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await projectService.list(profile.id);
      if (fetchError) {
        setError(fetchError);
      } else {
        setProjects(data);
      }
      setLoading(false);
    };

    loadProjects();
  }, [profile]);

  const doCreateProject = useCallback(async () => {
    if (!profile) return;
    const name = prompt('Project name:', `Untitled Project ${projects.length + 1}`);
    if (!name) return;

    const { data: newProject, error: createError } = await projectService.create(
      profile.id,
      name,
      DEFAULT_CODE
    );

    if (createError) {
      if (createError === 'program_limit_reached') {
        // ProgramLimitGate should have caught this, but handle it anyway
        return;
      }
      setError(createError);
      return;
    }

    if (newProject) {
      setProjects(prev => [newProject, ...prev]);
    }
  }, [profile, projects.length]);

  const deleteProject = useCallback(async (id: string) => {
    if (!profile) return;
    if (!window.confirm('Are you sure you want to delete this project?')) return;

    const { error: deleteError } = await projectService.delete(id, profile.id);
    if (deleteError) {
      setError(deleteError);
    } else {
      setProjects(prev => prev.filter(p => p.id !== id));
    }
    setContextMenu(null);
  }, [profile]);

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffH = Math.floor(diffMs / 3_600_000);
      if (diffH < 1) return 'Just now';
      if (diffH < 24) return `${diffH}h ago`;
      const diffD = Math.floor(diffH / 24);
      if (diffD === 1) return 'Yesterday';
      if (diffD < 7) return `${diffD}d ago`;
      return d.toLocaleDateString();
    } catch { return 'Unknown'; }
  };

  const maxPrograms = capabilities.maxPrograms;
  const isLimited = maxPrograms !== -1;
  // Use server-side program count from profile, NOT local array length
  const currentCount = programCount;
  const atLimit = isLimited && currentCount >= maxPrograms;
  const nearLimit = isLimited && currentCount >= maxPrograms - 2 && !atLimit;

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 overflow-auto bg-bg-base p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 size={32} className="text-brand-500 animate-spin mb-4" />
            <p className="text-text-muted text-sm">Loading projects…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-bg-base p-8" onClick={() => setContextMenu(null)}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileCode2 className="text-brand-500" /> Projects
            </h1>
            {isLimited && (
              <span className={`text-xs font-mono px-2 py-1 rounded-lg border ${
                atLimit
                  ? 'bg-hazard/10 border-hazard/30 text-hazard'
                  : nearLimit
                    ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                    : 'bg-bg-panel border-border-subtle text-text-muted'
              }`}>
                {currentCount} / {maxPrograms} programs
              </span>
            )}
          </div>

          <ProgramLimitGate currentCount={currentCount} onAllow={doCreateProject}>
            {(handleCreate) => (
              <button
                onClick={handleCreate}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-lg ${
                  atLimit
                    ? 'bg-white/5 text-text-muted border border-border-subtle hover:bg-white/10'
                    : 'bg-brand-500 hover:bg-brand-400 text-white shadow-brand-500/20'
                }`}
              >
                {atLimit ? <Lock size={14} /> : <Plus size={16} />}
                {atLimit ? 'Upgrade for More' : 'New Project'}
              </button>
            )}
          </ProgramLimitGate>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-hazard/5 border border-hazard/20 flex items-center gap-3">
            <span className="text-hazard text-xs">⚠️</span>
            <p className="text-xs text-hazard/80 flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-hazard/60 hover:text-hazard text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Near-limit warning */}
        {nearLimit && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20 flex items-center gap-3">
            <span className="text-yellow-400 text-xs">⚡</span>
            <p className="text-xs text-yellow-400/80">
              You're approaching your Free plan limit. <a href="/pricing" className="underline font-semibold text-yellow-400">Upgrade to Pro</a> for unlimited projects.
            </p>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-bg-surface border border-border-subtle flex items-center justify-center mb-6">
              <FolderOpen size={36} className="text-text-muted" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No projects yet</h2>
            <p className="text-text-muted text-sm mb-6 max-w-sm">Create your first MIPS assembly project to get started with the pipeline simulator.</p>
            <ProgramLimitGate currentCount={currentCount} onAllow={doCreateProject}>
              {(handleCreate) => (
                <button
                  onClick={handleCreate}
                  className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-brand-500/20"
                >
                  <Plus size={16} /> Create First Project
                </button>
              )}
            </ProgramLimitGate>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(proj => (
              <div
                key={proj.id}
                onClick={() => navigate(`/simulator?project=${proj.id}`)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ id: proj.id, x: e.clientX, y: e.clientY });
                }}
                className="group bg-bg-surface border border-border-subtle rounded-2xl p-5 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all cursor-pointer relative"
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-lg font-bold text-white group-hover:text-brand-400 truncate pr-2">{proj.name}</h3>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteProject(proj.id); }}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-hazard transition-all p-1 rounded-lg hover:bg-hazard/10 shrink-0"
                    title="Delete project"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-xs text-text-muted flex items-center gap-1 mb-4">
                  <Clock size={12} /> {formatDate(proj.updated_at)}
                </p>
                
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono bg-bg-panel px-2 py-1 rounded border border-border-subtle text-text-main">
                    {proj.code.split(/\r?\n/).length} lines
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed bg-bg-surface border border-border-subtle rounded-xl shadow-2xl py-1 z-50 min-w-[140px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => deleteProject(contextMenu.id)}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-hazard hover:bg-hazard/10 transition-colors"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
