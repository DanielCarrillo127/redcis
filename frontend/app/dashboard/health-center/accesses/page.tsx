'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { SkeletonCardList } from '@/components/dashboard/skeleton-list';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/contexts/auth-context';
import { useMounted } from '@/lib/hooks/use-mounted';
import { useRouteGuard } from '@/lib/hooks/use-route-guard';
import { HC_NAV_ITEMS } from '@/lib/constants/navigation';
import type { AccessPermission } from '@/lib/types';
import { getMyPatients, grantToAccessPermission } from '@/lib/api/access';
import { Users, Dot, User, CalendarClock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

export default function AccessesPage() {
  const { currentUser, isInitializing } = useAuth();
  const mounted = useMounted();
  useRouteGuard({ requiredRole: 'health_center' });

  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<AccessPermission[]>([]);

  useEffect(() => {
    const loadPatients = async () => {
      if (!currentUser?.id) return;
      setLoading(true);
      try {
        const grants = await getMyPatients();
        setPermissions(grants.map(grantToAccessPermission));
      } catch (error) {
        console.error('Error loading patients:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPatients();
  }, [currentUser]);

  if (!mounted || isInitializing || !currentUser) return null;

  if (loading) {
    return (
      <DashboardLayout navItems={HC_NAV_ITEMS}>
        <SkeletonCardList count={4} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={HC_NAV_ITEMS}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accesos Otorgados</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pacientes que han autorizado el acceso a tu centro de salud
          </p>
        </div>

        {permissions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-14 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/8 flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-primary/60" />
            </div>
            <h3 className="text-base font-semibold mb-1">Sin accesos activos</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Aún no tienes accesos autorizados de pacientes
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {permissions.map((perm) => (
              <Link
                key={perm.id}
                href={`/dashboard/health-center/patient/${perm.patientId}`}
              >
                <div className="p-4 rounded-xl border border-border bg-card hover:shadow-md transition-all duration-200 cursor-pointer group">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/8 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-primary/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-sm truncate">
                          {perm.patientName ?? `Paciente ${perm.patientId.substring(0, 8)}`}
                        </h3>
                        <Badge variant="secondary" className="bg-secondary/10 text-secondary border-secondary/20 shrink-0 text-xs">
                          Activo
                        </Badge>
                      </div>

                      <div className="space-y-1 mt-2 text-xs text-muted-foreground">
                        {perm.patientDni && (
                          <p><span className="font-medium text-foreground">DNI:</span> {perm.patientDni}</p>
                        )}
                        {perm.patientEmail && (
                          <p><span className="font-medium text-foreground">Email:</span> {perm.patientEmail}</p>
                        )}
                        <p>
                          <span className="font-medium text-foreground">Acceso:</span>{' '}
                          {perm.permission === 'view' ? 'Solo lectura' : 'Lectura y escritura'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                        <CalendarClock className="w-3 h-3" />
                        <span>
                          Otorgado{' '}
                          {formatDistanceToNow(new Date(perm.grantedAt), { addSuffix: true, locale: es })}
                        </span>
                        {perm.expiresAt && (
                          <span className="ml-2">
                            · Expira {new Date(perm.expiresAt).toLocaleDateString('es-ES')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Acerca de los accesos</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              'Cada acceso es verificable e inmutable en blockchain',
              'Los pacientes pueden revocar el acceso en cualquier momento',
              'Se mantiene auditoría completa de quién accedió y cuándo',
            ].map((text) => (
              <li key={text} className="flex items-start gap-2">
                <Dot className="text-primary shrink-0 mt-0.5" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
