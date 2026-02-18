'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useBlockchain } from '@/lib/contexts/blockchain-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardLayout, SidebarNav } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, BarChart3, Users, Loader2, Dot } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function SearchPage() {
  const { isAuthenticated, currentUser } = useAuth();
  const { searchPatientByDocument, grantAccess } = useBlockchain();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [document, setDocument] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundPatient, setFoundPatient] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated || currentUser?.role !== 'healthcenter') {
      router.push('/login');
    }
  }, [isAuthenticated, currentUser, router]);

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
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document.trim()) {
      toast.error('Ingresa un DNI');
      return;
    }

    setLoading(true);
    try {
      const patientId = searchPatientByDocument(document);
      if (patientId) {
        // Grant access
        grantAccess(
          patientId,
          currentUser!.id,
          currentUser!.name,
          'view'
        );
        setFoundPatient(patientId);
        toast.success('Acceso otorgado. Redirigiendo...');
        setTimeout(() => {
          router.push(`/dashboard/health-center/patient/${patientId}`);
        }, 1000);
      } else {
        toast.error('Paciente no encontrado. Intenta con: 12345678');
        setFoundPatient(null);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !isAuthenticated || !currentUser) {
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
              Busca un paciente utilizando su número de documento de identidad
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
                  <Button type="submit" disabled={loading} className="gap-2">
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
                <p className="text-xs text-muted-foreground">
                  Para esta demostración, usa: <strong>12345678</strong>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Cómo Funciona la Búsqueda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="space-y-3 list-decimal list-inside">
              <li>
                <span className="font-medium">Ingresa el DNI</span> del paciente
              </li>
              <li>
                <span className="font-medium">Sistema verifica</span> que el paciente existe
              </li>
              <li>
                <span className="font-medium">Se solicita acceso</span> al paciente (en blockchain)
              </li>
              <li>
                <span className="font-medium">Paciente aprueba</span> la solicitud (si lo desea)
              </li>
              <li>
                <span className="font-medium">Tienes acceso</span> al historial verificable
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Demo Info */}
        {/* <Card className="border-accent/20 bg-accent/5">
          <CardHeader>
            <CardTitle>Información de Demostración</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              En este MVP, el flujo se simplifica para demostración:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-accent mt-1"><Dot /></span>
                Los accesos se otorgan automáticamente
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-1"><Dot /></span>
                Puedes registrar eventos inmediatamente
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-1"><Dot /></span>
                Todos los eventos tienen hash SHA-256
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-1"><Dot /></span>
                Los registros son inmutables
              </li>
            </ul>

            <div className="mt-4 p-3 rounded bg-background border border-border">
              <p className="font-semibold mb-2">Demo User:</p>
              <p className="text-muted-foreground">
                <strong>Nombre:</strong> Juan Pérez García
              </p>
              <p className="text-muted-foreground">
                <strong>DNI:</strong> 12345678
              </p>
            </div>
          </CardContent>
        </Card> */}

        {/* Links */}
        <div className="flex gap-4">
          <Link href="/dashboard/health-center" className="flex-1">
            <Button variant="outline" className="w-full">
              Volver a Dashboard
            </Button>
          </Link>
          <Link href="/dashboard/health-center/accesses" className="flex-1">
            <Button variant="outline" className="w-full">
              Ver Accesos
            </Button>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
