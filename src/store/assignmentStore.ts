import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AssignmentProfile } from '../engine/assignmentProfile';

interface AssignmentStore {
  customAssignments: AssignmentProfile[];
  addAssignment: (assignment: AssignmentProfile) => void;
  updateAssignment: (assignment: AssignmentProfile) => void;
  deleteAssignment: (id: string) => void;
  importAssignments: (assignments: AssignmentProfile[]) => void;
}

export const useAssignmentStore = create<AssignmentStore>()(
  persist(
    (set) => ({
      customAssignments: [],
      addAssignment: (assignment) =>
        set((state) => ({ customAssignments: [...state.customAssignments, assignment] })),
      updateAssignment: (updated) =>
        set((state) => ({
          customAssignments: state.customAssignments.map((a) =>
            a.id === updated.id ? updated : a
          ),
        })),
      deleteAssignment: (id) =>
        set((state) => ({
          customAssignments: state.customAssignments.filter((a) => a.id !== id),
        })),
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
    }),
    {
      name: 'archsim_custom_assignments',
    }
  )
);
