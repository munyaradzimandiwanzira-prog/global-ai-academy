import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import type { Role } from '@shared/rbac';
import { PageLoader, Empty } from '@/components/ui';
import { ShieldAlert } from 'lucide-react';

export function RequireAuth({ children }: { children?: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children ?? <Outlet />}</>;
}

export function RequireRole({ roles, children }: { roles: Role[]; children?: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!roles.includes(user.role)) {
    return (
      <div className="container py-16">
        <Empty icon={<ShieldAlert className="h-10 w-10" />} title="This area is for staff">
          Your account doesn’t have access to this page. If you teach, request teaching access from Settings.
        </Empty>
      </div>
    );
  }
  return <>{children ?? <Outlet />}</>;
}
