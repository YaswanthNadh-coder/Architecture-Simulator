import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsStore {
  fontSize: string;
  theme: string;
  setFontSize: (size: string) => void;
  setTheme: (theme: string) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      fontSize: '14px',
      theme: 'always-dark',
      setFontSize: (size) => set({ fontSize: size }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'archsim_settings',
    }
  )
);
