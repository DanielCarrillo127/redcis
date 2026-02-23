'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardLayout, SidebarNav } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { searchPatientByDni, FoundPatient } from '@/lib/api/identity';
import { Search, BarChart3, Users, Loader2, Dot, User } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function SearchPage() {
  const { isAuthenticated, currentUser, isInitializing } = useAuth();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [document, setDocument] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundPatient, setFoundPatient] = useState<FoundPatient | null>(null);

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
      active: true,
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document.trim()) {
      toast.error('Ingresa un DNI');
      return;
    }

    setLoading(true);
    try {
      const patient = await searchPatientByDni(document);
      if (patient) {
        setFoundPatient(patient);
        toast.success(`Paciente encontrado: ${patient.name}`);
      } else {
        toast.error('Paciente no encontrado con ese DNI');
        setFoundPatient(null);
      }
    } catch (error) {
      toast.error('Error al buscar el paciente');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || isInitializing || !isAuthenticated || !currentUser) {
    return null;
  }

  return (
    <DashboardLayout
      title="Buscar Paciente"
      sidebar={<SidebarNav items={sidebarItems} />}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Buscar Paciente</h1>
          <p className="text-muted-foreground">
            Ingresa el DNI del paciente para solicitar acceso a su historial clínico
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Búsqueda por DNI</CardTitle>
            <CardDescription>
              Busca un paciente utilizando su número de documento de identidad.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="document">Número de DNI</Label>
                <div className="flex gap-2">
                  <Input
                    id="document"
                    type="text"
                    placeholder="Ej: 12345678"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    disabled={loading}
                  />
                  <Button type="submit" disabled={loading} className="gap-2 cursor-pointer">
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        Buscar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Resultado de la búsqueda */}
        {foundPatient && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 gap-1">
            <CardHeader>
              <CardTitle className="text-green-800 dark:text-green-200">
                Paciente Encontrado
              </CardTitle>
            </CardHeader>
            <CardContent className="">
              <p className="font-medium">{foundPatient.name}</p>
              <p className="text-sm text-muted-foreground">
                DNI: {foundPatient.dni} - Correo electrónico: {foundPatient.email}
              </p>
              <Button

                className="cursor-pointer w-full mt-3 bg-green-200 text-green-800 border-green-800 hover:bg-green-600/90 hover:text-white"
                onClick={() => router.push(`/dashboard/health-center/patient/${foundPatient.wallet}`)}
              >
                Ver Historial
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Help Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Cómo Funciona la Búsqueda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="space-y-3 list-decimal list-inside">
              <li>
                <span className="font-medium">Ingresa el DNI</span> del paciente.
              </li>
              <li>
                <span className="font-medium">Sistema verifica</span> que el paciente existe.
              </li>
              <li>
                Si el paciente <span className="font-medium"> ha otorgado acceso</span> desde su panel.
              </li>
              <li>
                <span className="font-medium">Tienes acceso</span> al historial verificable.
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Links */}
        <div className="flex gap-4">
          <Link href="/dashboard/health-center" className="flex-1">
            <Button variant="outline" className="w-full cursor-pointer">
              Volver a Dashboard
            </Button>
          </Link>
          <Link href="/dashboard/health-center/accesses" className="flex-1">
            <Button variant="outline" className="w-full cursor-pointer">
              Verificar Accesos
            </Button>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
