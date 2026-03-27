'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import type { UserRole } from '@/lib/types';

interface RouteGuardOptions {
  requiredRole?: UserRole;
  redirectTo?: string;
}

export function useRouteGuard({
  requiredRole,
  redirectTo = '/login',
}: RouteGuardOptions = {}) {
  const { isAuthenticated, currentUser, isInitializing } = useAuth();
  const router = useRouter();
  const userId = currentUser?.id;
  const userRole = currentUser?.role;

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated || !userId) {
      router.push(redirectTo);
      return;
    }
    if (requiredRole && userRole !== requiredRole) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, userId, userRole, router, isInitializing, requiredRole, redirectTo]);
}
