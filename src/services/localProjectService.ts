// src/services/localProjectService.ts
// Drop-in replacement for projectService — uses localStorage, no auth needed.

const STORAGE_KEY = 'archsim_projects';

export interface LocalProject {
  id: string;
  name: string;
  code: string;
  isa: 'mips' | 'riscv';
  description: string;
  created_at: string;
  updated_at: string;
}

function readAll(): LocalProject[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function writeAll(projects: LocalProject[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function makeId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

export const localProjectService = {
  async list(_userId?: string) {
    const data = readAll().sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    return { data, error: null };
  },

  async create(_userId: string | undefined, name: string, code: string, isa: 'mips' | 'riscv' = 'mips') {
    const project: LocalProject = {
      id: makeId(),
      name,
      code,
      isa,
      description: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const all = readAll();
    all.unshift(project);
    writeAll(all);
    return { data: project, error: null };
  },

  async update(projectId: string, updates: Partial<Pick<LocalProject, 'name' | 'code' | 'description' | 'isa'>>) {
    const all = readAll();
    const idx = all.findIndex(p => p.id === projectId);
    if (idx === -1) return { data: null, error: 'Project not found' };
    all[idx] = { ...all[idx], ...updates, updated_at: new Date().toISOString() };
    writeAll(all);
    return { data: all[idx], error: null };
  },

  async delete(projectId: string, _userId?: string) {
    const all = readAll().filter(p => p.id !== projectId);
    writeAll(all);
    return { error: null };
  },

  async getById(projectId: string) {
    const project = readAll().find(p => p.id === projectId) ?? null;
    return { data: project, error: project ? null : 'Not found' };
  },
};
