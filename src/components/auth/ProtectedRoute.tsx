import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

function PremiumLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="relative flex items-center justify-center">
        {/* Anel externo pulsante */}
        <div className="absolute h-16 w-16 rounded-2xl border border-primary/20 animate-ping opacity-30" />
        {/* Container do logo */}
        <div className="relative h-14 w-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, hsl(228 42% 14%), hsl(228 42% 18%))', border: '1px solid hsl(193 100% 54% / 0.25)' }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="plg" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#16C7FF" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            <path d="M8 24 L8 8 L24 24 L24 8" stroke="url(#plg)" strokeWidth="2.75"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PremiumLoader />;


  if (!isAuthenticated) {
    // Rota raiz → landing page; demais rotas protegidas → login com ?from=
    if (location.pathname === '/' || location.pathname === '') {
      return <Navigate to="/home" replace />;
    }
    const from = encodeURIComponent(location.pathname);
    return <Navigate to={`/login?from=${from}`} replace />;
  }

  return <Outlet />;
}

/** Rota exclusiva para admins. Redireciona não-admins para o dashboard. */
export function AdminRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-xs text-muted-foreground animate-pulse">Verificando acesso...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?from=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
