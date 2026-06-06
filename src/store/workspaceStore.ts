import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  color: string;
  avatar: string;
  isOnline: boolean;
  cursor?: { line: number; column: number };
}

export interface ActivityEvent {
  id: string;
  userId: string;
  type: 'join' | 'leave' | 'edit' | 'run' | 'chat';
  timestamp: number;
  data?: string;
}

interface WorkspaceState {
  users: User[];
  currentUser: User;
  activities: ActivityEvent[];
  
  // Actions
  addActivity: (type: ActivityEvent['type'], data?: string) => void;
  updateCursor: (line: number, column: number) => void;
  sendChatMessage: (message: string) => void;
}

const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Dr. Patterson', color: '#f43f5e', avatar: 'P', isOnline: true },
  { id: 'u2', name: 'Alice (You)', color: '#3b82f6', avatar: 'A', isOnline: true },
  { id: 'u3', name: 'Bob', color: '#10b981', avatar: 'B', isOnline: false },
];

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  users: MOCK_USERS,
  currentUser: MOCK_USERS[1], // Alice
  activities: [
    { id: '1', userId: 'u1', type: 'join', timestamp: Date.now() - 3600000 },
    { id: '2', userId: 'u1', type: 'chat', timestamp: Date.now() - 3500000, data: 'Welcome to Lab 3! Let me know if you need help with the forwarding paths.' },
    { id: '3', userId: 'u2', type: 'join', timestamp: Date.now() - 600000 },
  ],

  addActivity: (type, data) => set(state => ({
    activities: [...state.activities, {
      id: Math.random().toString(36).substr(2, 9),
      userId: state.currentUser.id,
      type,
      timestamp: Date.now(),
      data
    }]
  })),

  updateCursor: (line, column) => set(state => ({
    users: state.users.map(u => 
      u.id === state.currentUser.id ? { ...u, cursor: { line, column } } : u
    )
  })),

  sendChatMessage: (message) => {
    get().addActivity('chat', message);
  }
}));
