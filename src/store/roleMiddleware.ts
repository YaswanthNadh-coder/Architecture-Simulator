import { useAuthStore } from './authStore';

export type Role = 'student' | 'instructor';

/**
 * RoleManager — Reads the authenticated user's actual role from the auth store.
 * 
 * Maps profile roles to permission checks:
 * - 'instructor' can edit rubrics, view plagiarism, edit starter code
 * - 'student' can submit assignments
 */
export class RoleManager {
  static getRole(): Role {
    const profile = useAuthStore.getState().profile;
    return profile?.role ?? 'student';
  }

  static canEditRubric(): boolean {
    return this.getRole() === 'instructor';
  }

  static canViewPlagiarismDetector(): boolean {
    return this.getRole() === 'instructor';
  }

  static canEditStarterCode(): boolean {
    return this.getRole() === 'instructor';
  }

  static canSubmitAssignment(): boolean {
    return this.getRole() === 'student';
  }
}
