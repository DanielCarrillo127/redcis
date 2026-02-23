'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardLayout, SidebarNav } from '@/components/dashboard-layout';
import { getMyPatients, grantToAccessPermission } from '@/lib/api/access';
import { searchPatientByDni } from '@/lib/api/identity';
import { AccessPermission } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Search, Plus, Eye, BarChart3, Users, User, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function HealthCenterDashboard() {
  const { isAuthenticated, currentUser, isInitializing } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<AccessPermission[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchDocument, setSearchDocument] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
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
        setPermissions(grants.map(grantToAccessPermission));
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
      active: true,
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
    },
    {
      href: '/dashboard/health-center/profile',
      label: 'Perfil',
      icon: <User className="w-5 h-5" />,
    },
  ];

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
    } catch (error) {
      toast.error('Error al buscar el paciente');
    } finally {
      setSearching(false);
    }
  };

  if (!mounted || isInitializing || !isAuthenticated || !currentUser) {
    return null;
  }

  return (
    <DashboardLayout
      title="Hospital/Centro de Salud"
      sidebar={<SidebarNav items={sidebarItems} />}
    >
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border border-border bg-card hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Pacientes Autorizados
                </p>
                <p className="text-3xl font-bold">{permissions.length}</p>
              </div>
              <Users className="w-8 h-8 text-accent opacity-50" />
            </div>
          </div>

          <div className="p-4 rounded-lg border border-border bg-card hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Permisos Activos
                </p>
                <p className="text-3xl font-bold">
                  {permissions.filter((p) => p.active).length}
                </p>
              </div>
              <Eye className="w-8 h-8 text-primary opacity-50" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Pacientes Autorizados</h2>
            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Search className="w-4 h-4" />
                  Buscar Paciente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Buscar Paciente</DialogTitle>
                  <DialogDescription>
                    Ingresa el DNI del paciente para solicitar acceso a su historial
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dni">Número de DNI</Label>
                    <Input
                      id="dni"
                      placeholder="Ej: 12345678"
                      value={searchDocument}
                      onChange={(e) => setSearchDocument(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === 'Enter' && handleSearchPatient()
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Ingresa el número de documento del paciente
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setSearchOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleSearchPatient} disabled={searching}>
                    {searching ? 'Buscando...' : 'Buscar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {permissions.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  Sin Pacientes Autorizados
                </h3>
                <p className="text-muted-foreground mb-6">
                  Aún no tienes acceso autorizado a ningún historial de paciente
                </p>
                <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Search className="w-4 h-4" />
                      Buscar Paciente
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Buscar Paciente</DialogTitle>
                      <DialogDescription>
                        Ingresa el DNI del paciente para solicitar acceso a su historial
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="dni">Número de DNI</Label>
                        <Input
                          id="dni"
                          placeholder="Ej: 12345678"
                          value={searchDocument}
                          onChange={(e) => setSearchDocument(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === 'Enter' && handleSearchPatient()
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Ingresa el número de documento del paciente
                        </p>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setSearchOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSearchPatient}
                        disabled={searching}
                      >
                        {searching ? 'Buscando...' : 'Buscar'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {permissions.map((perm) => (
                <Link
                  key={perm.id}
                  href={`/dashboard/health-center/patient/${perm.patientId}`}
                >
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent>
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 text-sm text-muted-foreground mt-2">
                          <h3 className="font-semibold text-lg text-black">
                            {perm.patientName ?? `Paciente ${perm.patientId.substring(0, 8)}`}
                          </h3>
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
                        <span
                          className={`px-3 py-1 rounded text-xs font-medium ${perm.active
                            ? 'bg-green-100 text-green-900'
                            : 'bg-gray-100 text-gray-900'
                            }`}
                        >
                          {perm.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* How it works */}
        <Card className="border-accent/20 bg-accent/5">
          <CardHeader>
            <CardTitle>Flujo de Acceso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="space-y-2 list-decimal list-inside">
              <li>
                <span className="font-medium">Busca el DNI del paciente</span>
              </li>
              <li>
                <span className="font-medium">Solicita acceso</span> - El paciente verá la solicitud
              </li>
              <li>
                <span className="font-medium">Una vez aprobado</span>, puedes ver su historial verificable
              </li>
              <li>
                <span className="font-medium">Registra eventos</span> en blockchain si tienes permisos
              </li>
            </ol>
            <p className="text-muted-foreground mt-4">
              Los pacientes controlan el acceso a su historial desde su panel.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
