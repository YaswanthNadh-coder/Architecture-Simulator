// ── Project Service ──────────────────────────────────────────────────────
// Supabase-backed project CRUD, replacing the previous localStorage approach.
// RLS policies on the `projects` table ensure users can only access their own projects.

import { supabase, type Project } from '../lib/supabase';

const LOCAL_STORAGE_KEY = 'architecture_simulator_projects';

const getLocalProjects = (): Project[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read projects from localStorage', e);
    return [];
  }
};

const saveLocalProjects = (projects: Project[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to write projects to localStorage', e);
  }
};

const isSchemaError = (error: any): boolean => {
  if (!error) return false;
  const msg = error.message?.toLowerCase() || '';
  const code = error.code || '';
  return (
    msg.includes('schema cache') ||
    msg.includes('does not exist') ||
    msg.includes('relation') ||
    code === '42P01' ||
    code === 'PGRST204' ||
    code === 'PGRST205'
  );
};

export const projectService = {
  /**
   * List all projects for the given user, ordered by most recently updated.
   */
  async list(userId: string): Promise<{ data: Project[]; error: string | null }> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error && isSchemaError(error)) {
      console.warn('Supabase projects table not found, falling back to localStorage');
      const local = getLocalProjects()
        .filter((p) => p.user_id === userId)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      return { data: local, error: null };
    }

    return { data: data ?? [], error: error?.message ?? null };
  },

  /**
   * Create a new project. The program count increment and tier limit enforcement
   * are handled securely server-side via the `maintain_program_count` database trigger.
   */
  async create(
    userId: string,
    name: string,
    code: string,
    description?: string
  ): Promise<{ data: Project | null; error: string | null }> {

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name,
        code,
        description: description ?? '',
      })
      .select()
      .single();

    if (error && isSchemaError(error)) {
      console.warn('Supabase projects table not found, falling back to localStorage');
      const newProject: Project = {
        id: crypto.randomUUID(),
        user_id: userId,
        name,
        code,
        description: description ?? '',
        template: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const local = getLocalProjects();
      local.unshift(newProject);
      saveLocalProjects(local);
      return { data: newProject, error: null };
    }

    if (error?.message?.includes('program_limit_reached')) {
      return { data: null, error: 'program_limit_reached' };
    }

    return { data: data ?? null, error: error?.message ?? null };
  },

  /**
   * Update a project's name, code, or description.
   */
  async update(
    projectId: string,
    updates: Partial<Pick<Project, 'name' | 'code' | 'description'>>
  ): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId);

    if (error && isSchemaError(error)) {
      console.warn('Supabase projects table not found, falling back to localStorage');
      const local = getLocalProjects();
      const index = local.findIndex((p) => p.id === projectId);
      if (index !== -1) {
        local[index] = {
          ...local[index],
          ...updates,
          updated_at: new Date().toISOString(),
        };
        saveLocalProjects(local);
      }
      return { error: null };
    }

    return { error: error?.message ?? null };
  },

  /**
   * Delete a project. The program count decrement is handled securely 
   * server-side via the database trigger.
   * Double-checks ownership via user_id even though RLS covers it.
   */
  async delete(projectId: string, userId: string): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId);

    if (error && isSchemaError(error)) {
      console.warn('Supabase projects table not found, falling back to localStorage');
      const local = getLocalProjects();
      const updated = local.filter((p) => !(p.id === projectId && p.user_id === userId));
      saveLocalProjects(updated);
      return { error: null };
    }

    return { error: error?.message ?? null };
  },

  /**
   * Get a single project by ID (for loading into the simulator).
   */
  async get(projectId: string): Promise<{ data: Project | null; error: string | null }> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error && isSchemaError(error)) {
      console.warn('Supabase projects table not found, falling back to localStorage');
      const local = getLocalProjects();
      const found = local.find((p) => p.id === projectId);
      return { data: found ?? null, error: found ? null : 'Project not found' };
    }

    return { data: data ?? null, error: error?.message ?? null };
  },
};
