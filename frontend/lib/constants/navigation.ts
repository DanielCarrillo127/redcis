import type { LucideIcon } from 'lucide-react';
import {
  FileText,
  Plus,
  Lock,
  User,
  BarChart3,
  Search,
  Users,
  Building2,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const PATIENT_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard/patient', label: 'Mi Historial', icon: FileText },
  { href: '/dashboard/patient/add-record', label: 'Agregar Registro', icon: Plus },
  { href: '/dashboard/patient/accesses', label: 'Accesos', icon: Lock },
  { href: '/dashboard/patient/profile', label: 'Perfil', icon: User },
];

export const HC_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard/health-center', label: 'Dashboard', icon: BarChart3 },
  { href: '/dashboard/health-center/search', label: 'Buscar Paciente', icon: Search },
  { href: '/dashboard/health-center/accesses', label: 'Accesos Otorgados', icon: Users },
  { href: '/dashboard/health-center/profile', label: 'Perfil', icon: User },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard/admin', label: 'Centros de Salud', icon: Building2 },
];
