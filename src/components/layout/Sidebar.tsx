import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Box, FileCode2, ActivitySquare, CreditCard, Settings, LogOut, BarChart3, Lock, Sparkles, BookOpen, GraduationCap } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSubscriptionStore } from '../../store/subscriptionStore';

export const Sidebar = () => {
  const location = useLocation();
  const { profile, logout } = useAuthStore();
  const { tier, canAccess } = useSubscriptionStore();
  

  // Extract initials for the avatar
  const initials = profile?.full_name 
    ? profile.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'A';

  const navItems = [
    { icon: <LayoutDashboard size={22} />, path: '/', label: 'Dashboard' },
    { icon: <BookOpen size={22} />, path: '/learn', label: 'Learn' },
    { icon: <Box size={22} />, path: '/simulator', label: 'Simulator' },
    { icon: <FileCode2 size={22} />, path: '/files', label: 'Projects' },
    { icon: <ActivitySquare size={22} />, path: '/activity', label: 'Activity' },
    {
      icon: <BarChart3 size={22} />,
      path: '/analytics',
      label: 'Analytics',
      locked: !canAccess('analyticsDashboard'),
    },
    { icon: <GraduationCap size={22} />, path: '/courses', label: 'Courses' },
  ];

  const bottomItems = [
    { icon: <CreditCard size={22} />, path: '/pricing', label: 'Plans' },
    { icon: <Settings size={22} />, path: '/settings', label: 'Settings' },
  ];

  // Tier badge config
  const tierBadge = tier !== 'free' ? {
    label: tier.charAt(0).toUpperCase() + tier.slice(1),
    className: 'bg-brand-500/20 text-brand-400 border-brand-500/30',
  } : null;

  return (
    <div className="w-16 h-full bg-bg-panel border-r border-border-subtle flex flex-col items-center py-6 shadow-xl z-20 relative shrink-0">
      {/* Avatar with tier badge */}
      <div className="mb-8 relative">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-brand-500/20">
          {initials}
        </div>
        {tierBadge && (
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-md flex items-center justify-center ${tierBadge.className} border`}>
            <Sparkles size={8} />
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col gap-6 w-full items-center">
        {navItems.map(item => (
          <NavItem 
            key={item.path} 
            icon={item.icon} 
            path={item.path} 
            active={location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))} 
            label={item.label}
            locked={'locked' in item ? item.locked : false}
          />
        ))}
      </div>

      <div className="flex flex-col gap-6 w-full items-center mt-auto">
        {bottomItems.map(item => (
          <NavItem 
            key={item.path} 
            icon={item.icon} 
            path={item.path} 
            active={location.pathname === item.path} 
            label={item.label} 
          />
        ))}
        <button 
          onClick={logout}
          className="relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group text-text-muted hover:text-hazard hover:bg-hazard/10"
        >
          <div className="group-hover:scale-110 transition-transform">
            <LogOut size={22} />
          </div>
          {/* Tooltip */}
          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-bg-surface border border-border-subtle rounded-lg text-xs text-white font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none shadow-xl z-50">
            Log Out
            <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-bg-surface border-l border-b border-border-subtle rotate-45" />
          </div>
        </button>
      </div>
    </div>
  );
};

const NavItem = ({ icon, path, active, label, locked }: { icon: React.ReactNode, path: string, active: boolean, label: string, locked?: boolean }) => {
  return (
    <Link 
      to={path}
      className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group
        ${active ? 'bg-brand-500/10 text-brand-500' : 'text-text-muted hover:text-white hover:bg-white/5'}
      `}
    >
      {active && (
        <div className="absolute left-0 w-1 h-8 bg-brand-500 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
      )}
      <div className={`${active ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'group-hover:scale-110 transition-transform'}`}>
        {icon}
      </div>

      {/* Lock indicator for gated features */}
      {locked && (
        <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-bg-panel border border-border-subtle flex items-center justify-center">
          <Lock size={7} className="text-text-muted" />
        </div>
      )}
      
      {/* Tooltip */}
      <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-bg-surface border border-border-subtle rounded-lg text-xs text-white font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none shadow-xl z-50">
        {label}
        {locked && <span className="ml-1 text-text-muted">(Pro)</span>}
        <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-bg-surface border-l border-b border-border-subtle rotate-45" />
      </div>
    </Link>
  );
};
