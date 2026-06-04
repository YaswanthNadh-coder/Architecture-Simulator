import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const AppShell = () => {
  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: 'var(--color-bg-base)' }}>
      {/* Sidebar for all authenticated pages */}
      <Sidebar />
      
      {/* Main content area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Outlet />
      </main>
    </div>
  );
};
