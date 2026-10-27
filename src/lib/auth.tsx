import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PublicUser } from '@shared/api-types';
import { can, type Permission } from '@shared/rbac';
import { api } from './api';

interface AuthState {
  user: PublicUser | null;
  loading: boolean;
  can: (perm: Permission) => boolean;
  refresh: () => Promise<void>;
  setUser: (u: PublicUser | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export const ME_KEY = ['me'] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ME_KEY,
    queryFn: () => api.get<{ user: PublicUser | null }>('/api/me'),
    staleTime: 60_000,
  });
  const user = data?.user ?? null;

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading: isLoading,
      can: (perm) => can(user ? { role: user.role, plan: user.plan } : null, perm),
      refresh: async () => {
        await qc.invalidateQueries({ queryKey: ME_KEY });
      },
      setUser: (u) => qc.setQueryData(ME_KEY, { user: u }),
      logout: async () => {
        await api.post('/api/auth/logout');
        qc.clear();
        qc.setQueryData(ME_KEY, { user: null });
      },
    }),
    [user, isLoading, qc],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
