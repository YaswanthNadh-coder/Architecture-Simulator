// ── Project Service ──────────────────────────────────────────────────────
// Supabase-backed project CRUD, replacing the previous localStorage approach.
// RLS policies on the `projects` table ensure users can only access their own projects.

import { supabase, type Project } from '../lib/supabase';

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
    return { data: data ?? null, error: error?.message ?? null };
  },
};
