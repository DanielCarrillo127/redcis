import type { UserRole } from '@/lib/types';

export const ROLE_LABELS: Record<UserRole, string> = {
  individual: 'Paciente',
  health_center: 'Centro de Salud',
  admin: 'Administrador',
};

export const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  individual: '/dashboard/patient',
  health_center: '/dashboard/health-center',
  admin: '/dashboard/admin',
};

export function getDashboardPath(role: UserRole): string {
  return ROLE_DASHBOARD_PATHS[role] ?? '/dashboard/patient';
}
