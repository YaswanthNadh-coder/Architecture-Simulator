import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ASSIGNMENTS, type AssignmentProfile } from '../engine/assignmentProfile';
import {
  saveAssignmentToSupabase,
  loadAssignmentsFromSupabase,
  deleteAssignmentFromSupabase,
} from '../services/activityService';
import { useAuthStore } from './authStore';

interface AssignmentStore {
  customAssignments: AssignmentProfile[];
  syncing: boolean;
  lastSyncError: string | null;

  addAssignment: (assignment: AssignmentProfile) => void;
  updateAssignment: (assignment: AssignmentProfile) => void;
  deleteAssignment: (id: string) => void;
  duplicateAssignment: (id: string) => void;
  importAssignments: (assignments: AssignmentProfile[]) => void;

  // Supabase sync
  syncToSupabase: () => Promise<void>;
  loadFromSupabase: () => Promise<void>;
}

export const useAssignmentStore = create<AssignmentStore>()(
  persist(
    (set, get) => ({
      customAssignments: [],
      syncing: false,
      lastSyncError: null,

      addAssignment: (assignment) => {
        set((state) => ({ customAssignments: [...state.customAssignments, assignment] }));
        // Auto-sync to Supabase
        const user = useAuthStore.getState().profile;
        if (user) {
          saveAssignmentToSupabase(assignment, user.id).catch(() => {});
        }
      },

      updateAssignment: (updated) => {
        set((state) => ({
          customAssignments: state.customAssignments.map((a) =>
            a.id === updated.id ? updated : a
          ),
        }));
        const user = useAuthStore.getState().profile;
        if (user) {
          saveAssignmentToSupabase(updated, user.id).catch(() => {});
        }
      },

      deleteAssignment: (id) => {
        set((state) => ({
          customAssignments: state.customAssignments.filter((a) => a.id !== id),
        }));
        deleteAssignmentFromSupabase(id).catch(() => {});
      },

      duplicateAssignment: (id) => {
        const { customAssignments } = get();
        const all = [...ASSIGNMENTS, ...customAssignments];
        const original = all.find(a => a.id === id);
        if (!original) return;

        const duplicate: AssignmentProfile = {
          ...original,
          id: `${original.id}-copy-${Date.now().toString(36)}`,
          title: `${original.title} (Copy)`,
          testCases: original.testCases.map(tc => ({
            ...tc,
            id: `${tc.id}-copy-${Date.now().toString(36)}`,
          })),
        };

        set((state) => ({ customAssignments: [...state.customAssignments, duplicate] }));
        const user = useAuthStore.getState().profile;
        if (user) {
          saveAssignmentToSupabase(duplicate, user.id).catch(() => {});
        }
      },

      importAssignments: (newAssignments) =>
        set((state) => {
          const merged = [...state.customAssignments];
          for (const na of newAssignments) {
            const idx = merged.findIndex(a => a.id === na.id);
            if (idx >= 0) merged[idx] = na;
            else merged.push(na);
          }
          return { customAssignments: merged };
        }),

      syncToSupabase: async () => {
        const user = useAuthStore.getState().profile;
        if (!user) return;

        set({ syncing: true, lastSyncError: null });
        try {
          const { customAssignments } = get();
          for (const assignment of customAssignments) {
            const { error } = await saveAssignmentToSupabase(assignment, user.id);
            if (error) throw new Error(error);
          }
          set({ syncing: false });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Sync failed';
          set({ syncing: false, lastSyncError: message });
        }
      },

      loadFromSupabase: async () => {
        const user = useAuthStore.getState().profile;
        if (!user) return;

        set({ syncing: true, lastSyncError: null });
        try {
          const { assignments, error } = await loadAssignmentsFromSupabase(user.id);
          if (error) throw new Error(error);

          // Merge with local (Supabase takes priority)
          const { customAssignments } = get();
          const merged = [...customAssignments];
          for (const a of assignments) {
            const idx = merged.findIndex(m => m.id === a.id);
            if (idx >= 0) merged[idx] = a;
            else merged.push(a);
          }

          set({ customAssignments: merged, syncing: false });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Load failed';
          set({ syncing: false, lastSyncError: message });
        }
      },
    }),
    {
      name: 'archsim_custom_assignments',
    }
  )
);
