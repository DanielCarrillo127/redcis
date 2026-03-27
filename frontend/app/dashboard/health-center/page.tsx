'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { StatCard } from '@/components/dashboard/stat-card';
import { SkeletonPage } from '@/components/dashboard/skeleton-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/contexts/auth-context';
import { useMounted } from '@/lib/hooks/use-mounted';
import { useRouteGuard } from '@/lib/hooks/use-route-guard';
import { HC_NAV_ITEMS } from '@/lib/constants/navigation';
import type { AccessPermission } from '@/lib/types';
import { getMyPatients, grantToAccessPermission } from '@/lib/api/access';
import { searchPatientByDni } from '@/lib/api/identity';
import { Search, Eye, Users, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function HealthCenterDashboard() {
  const { currentUser, isInitializing } = useAuth();
  const router = useRouter();
  const mounted = useMounted();
  useRouteGuard({ requiredRole: 'health_center' });

  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<AccessPermission[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchDocument, setSearchDocument] = useState('');
  const [searching, setSearching] = useState(false);

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

  const activeCount = useMemo(
    () => permissions.filter((p) => p.active).length,
    [permissions],
  );

  const handleSearchPatient = async () => {
    if (!searchDocument.trim()) {
      toast.error('Ingresa el DNI del paciente');
      return;
    }
    setSearching(true);
    try {
      const patient = await searchPatientByDni(searchDocument);
      if (patient) {
        setSearchDocument('');
        setSearchOpen(false);
        router.push(`/dashboard/health-center/patient/${patient.wallet}`);
      } else {
        toast.error('Paciente no encontrado con ese DNI');
      }
    } catch {
      toast.error('Error al buscar el paciente');
    } finally {
      setSearching(false);
    }
  };

  if (!mounted || isInitializing || !currentUser) return null;

  if (loading) {
    return (
      <DashboardLayout navItems={HC_NAV_ITEMS}>
        <SkeletonPage />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={HC_NAV_ITEMS}>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pacientes Autorizados</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Pacientes que te han otorgado acceso a su historial
            </p>
          </div>
          <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Search className="w-4 h-4" />
                Buscar Paciente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Buscar Paciente</DialogTitle>
                <DialogDescription>
                  Ingresa el DNI del paciente para acceder a su historial
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="search-dni">Número de DNI</Label>
                <Input
                  id="search-dni"
                  placeholder="Ej: 12345678"
                  value={searchDocument}
                  onChange={(e) => setSearchDocument(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchPatient()}
                />
                <p className="text-xs text-muted-foreground">
                  Ingresa el número de documento del paciente
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSearchOpen(false)}>Cancelar</Button>
                <Button onClick={handleSearchPatient} disabled={searching}>
                  {searching ? 'Buscando...' : 'Buscar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            label="Pacientes Autorizados"
            value={permissions.length}
            icon={Users}
            description="Historials con acceso aprobado"
          />
          <StatCard
            label="Permisos Activos"
            value={activeCount}
            icon={UserCheck}
            variant="success"
            description="Accesos vigentes actualmente"
          />
        </div>

        {/* Patients list */}
        {permissions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-14 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/8 flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-primary/60" />
            </div>
            <h3 className="text-base font-semibold mb-1">Sin pacientes autorizados</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
              Aún no tienes acceso autorizado a ningún historial de paciente.
            </p>
            <Button size="sm" className="gap-2" onClick={() => setSearchOpen(true)}>
              <Search className="w-4 h-4" />
              Buscar Paciente
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {permissions.map((perm) => (
              <Link
                key={perm.id}
                href={`/dashboard/health-center/patient/${perm.patientId}`}
              >
                <div className="group flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all duration-150 cursor-pointer">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-semibold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {(perm.patientName ?? 'P')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {perm.patientName ?? `Paciente ${perm.patientId.substring(0, 8)}`}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        {perm.patientDni && <span>DNI {perm.patientDni}</span>}
                        <span>
                          {perm.permission === 'view' ? 'Solo lectura' : 'Lectura y escritura'}
                        </span>
                        <span>
                          Otorgado{' '}
                          {formatDistanceToNow(new Date(perm.grantedAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {perm.expiresAt && (
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        Expira {new Date(perm.expiresAt).toLocaleDateString('es-ES')}
                      </span>
                    )}
                    <Badge
                      variant={perm.active ? 'default' : 'secondary'}
                      className={perm.active ? 'bg-secondary/15 text-secondary border-secondary/25 hover:bg-secondary/20' : ''}
                    >
                      {perm.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                    <Eye className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Workflow guide */}
        <Card className="border-primary/15 bg-primary/3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Flujo de Acceso</CardTitle>
            <CardDescription className="text-xs">Cómo acceder al historial de un paciente</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
              <li><span className="font-medium text-foreground">Busca el DNI del paciente</span></li>
              <li><span className="font-medium text-foreground">Solicita acceso</span> — el paciente lo aprueba desde su panel</li>
              <li><span className="font-medium text-foreground">Una vez aprobado</span>, puedes ver su historial verificable</li>
              <li><span className="font-medium text-foreground">Registra eventos</span> en blockchain si tienes permisos de escritura</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
