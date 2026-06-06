export type Role = 'student' | 'ta' | 'professor';

export interface UserRole {
  userId: string;
  role: Role;
}

const CURRENT_USER_ROLE: Role = 'professor'; // Hardcoded for prototype demonstration

export class RoleManager {
  static getRole(): Role {
    return CURRENT_USER_ROLE;
  }

  static canEditRubric(): boolean {
    const role = this.getRole();
    return role === 'professor' || role === 'ta';
  }

  static canViewPlagiarismDetector(): boolean {
    const role = this.getRole();
    return role === 'professor' || role === 'ta';
  }

  static canEditStarterCode(): boolean {
    return this.getRole() === 'professor';
  }

  static canSubmitAssignment(): boolean {
    return this.getRole() === 'student';
  }
}
