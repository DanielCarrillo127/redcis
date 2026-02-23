'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardLayout, SidebarNav } from '@/components/dashboard-layout';
import { AccessPermission } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getMyPatients, grantToAccessPermission } from '@/lib/api/access';
import { Search, BarChart3, Users, Eye, Dot, User, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

export default function AccessesPage() {
  const { isAuthenticated, currentUser, isInitializing } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<AccessPermission[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only redirect after initialization is complete
    if (isInitializing) return;

    if (!isAuthenticated || currentUser?.role !== 'health_center') {
      router.push('/login');
    }
  }, [isAuthenticated, currentUser, router, isInitializing]);

  useEffect(() => {
    const loadPatients = async () => {
      if (!currentUser?.id) return;

      setLoading(true);
      try {
        const grants = await getMyPatients();
        const perms = grants.map(grantToAccessPermission);
        setPermissions(perms);
      } catch (error) {
        console.error('Error loading patients:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPatients();
  }, [currentUser]);

  const sidebarItems = [
    {
      href: '/dashboard/health-center',
      label: 'Dashboard',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      href: '/dashboard/health-center/search',
      label: 'Buscar Paciente',
      icon: <Search className="w-5 h-5" />,
    },
    {
      href: '/dashboard/health-center/accesses',
      label: 'Accesos Otorgados',
      icon: <Users className="w-5 h-5" />,
      active: true,
    },
    {
      href: '/dashboard/health-center/profile',
      label: 'Perfil',
      icon: <User className="w-5 h-5" />,
    },
  ];

  if (!mounted || isInitializing || !isAuthenticated || !currentUser) {
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout title="Accesos Otorgados" sidebar={<SidebarNav items={sidebarItems} />}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Accesos Otorgados"
      sidebar={<SidebarNav items={sidebarItems} />}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Accesos Otorgados</h1>
          <p className="text-muted-foreground">
            Pacientes que han autorizado el acceso a tu centro de salud
          </p>
        </div>

        {permissions.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Sin Accesos</h3>
              <p className="text-muted-foreground">
                Aún no tienes accesos autorizados de pacientes
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {permissions.map((perm) => (
              <Link
                key={perm.id}
                href={`/dashboard/health-center/patient/${perm.patientId}`}
              >
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          {perm.patientName ?? `Paciente ${perm.patientId.substring(0, 8)}`}
                        </h3>
                        <div className="space-y-1 text-sm text-muted-foreground mt-2">
                          {perm.patientDni && (
                            <p>
                              <span className="font-medium text-foreground"> DNI:</span>{' '}{perm.patientDni}
                            </p>
                          )}
                          {perm.patientEmail && (
                            <p>
                              <span className="font-medium text-foreground">Email:</span>{' '}{perm.patientEmail}
                            </p>
                          )}
                          <p>
                            <span className="font-medium text-foreground">
                              Acceso:
                            </span>{' '}
                            {perm.permission === 'view'
                              ? 'Solo lectura'
                              : 'Lectura y escritura'}
                          </p>
                          <p>
                            <span className="font-medium text-foreground">Otorgado:</span>{' '}
                            {formatDistanceToNow(new Date(perm.grantedAt), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </p>
                          <p>
                            <span className="font-medium text-foreground">Fecha de expiración:</span>{' '}
                            {perm.expiresAt ? new Date(perm.expiresAt).toLocaleDateString('es-ES') : 'Sin fecha de expiración'}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-border">
                          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-900">
                            Activo
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Information */}
        <Card className="border-accent/20 bg-accent/5">
          <CardHeader>
            <CardTitle>Acerca de los Accesos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Los pacientes controlan quién accede a su información. Aquí ves los accesos que te han otorgado.
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-accent mt-1"><Dot /></span>
                Cada acceso es verificable e inmutable
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-1"><Dot /></span>
                Los pacientes pueden revocar acceso en cualquier momento
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-1"><Dot /></span>
                Se mantiene auditoría completa de quién accedió y cuándo
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
