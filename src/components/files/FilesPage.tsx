import { useState, useCallback } from 'react';
import { FileCode2, Plus, Clock, Trash2, FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'archsim_projects';

interface Project {
  id: string;
  name: string;
  code: string;
  modified: string;
}

const getProjects = (): Project[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
};

const saveProjects = (projects: Project[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
};

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
  const [projects, setProjects] = useState<Project[]>(getProjects);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  const createProject = useCallback(() => {
    const name = prompt('Project name:', `Untitled Project ${projects.length + 1}`);
    if (!name) return;
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      code: DEFAULT_CODE,
      modified: new Date().toISOString(),
    };
    const updated = [newProject, ...projects];
    saveProjects(updated);
    setProjects(updated);
  }, [projects]);

  const deleteProject = useCallback((id: string) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    const updated = projects.filter(p => p.id !== id);
    saveProjects(updated);
    setProjects(updated);
    setContextMenu(null);
  }, [projects]);

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

  return (
    <div className="flex-1 overflow-auto bg-bg-base p-8" onClick={() => setContextMenu(null)}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileCode2 className="text-brand-500" /> Projects
          </h1>
          <button
            onClick={createProject}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-brand-500/20"
          >
            <Plus size={16} /> New Project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-bg-surface border border-border-subtle flex items-center justify-center mb-6">
              <FolderOpen size={36} className="text-text-muted" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No projects yet</h2>
            <p className="text-text-muted text-sm mb-6 max-w-sm">Create your first MIPS assembly project to get started with the pipeline simulator.</p>
            <button
              onClick={createProject}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-brand-500/20"
            >
              <Plus size={16} /> Create First Project
            </button>
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
                  <Clock size={12} /> {formatDate(proj.modified)}
                </p>
                
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono bg-bg-panel px-2 py-1 rounded border border-border-subtle text-text-main">
                    {proj.code.split('\n').length} lines
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
