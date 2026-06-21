import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading, user, profile } = useAuthStore();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center" style={{ background: 'var(--color-bg-base)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-500 to-cyan-400 flex items-center justify-center text-white font-bold text-xl animate-pulse">
            A
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-brand-500"
                style={{ animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Enforce email verification — if user has signed up but not confirmed,
  // redirect them to login with a message
  if (user && !user.email_confirmed_at) {
    return (
      <div className="h-screen w-full flex items-center justify-center" style={{ background: 'var(--color-bg-base)' }}>
        <div className="text-center p-8 rounded-2xl border max-w-sm"
          style={{ background: 'rgba(15,30,51,0.9)', borderColor: 'var(--color-border-subtle)' }}>
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📧</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Verify your email</h2>
          <p className="text-text-muted text-sm mb-4">
            Please check your inbox and click the verification link we sent to{' '}
            <span className="text-white">{user.email}</span> before continuing.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-400 transition-colors"
          >
            I've verified — refresh
          </button>
        </div>
      </div>
    );
  }

  // Profile not yet loaded from Supabase (can happen briefly after OAuth sign-in
  // if the DB trigger hasn't created the profile row yet)
  if (!profile) {
    return (
      <div className="h-screen w-full flex items-center justify-center" style={{ background: 'var(--color-bg-base)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-500 to-cyan-400 flex items-center justify-center text-white font-bold text-xl animate-pulse">
            A
          </div>
          <p className="text-text-muted text-xs">Loading profile…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
