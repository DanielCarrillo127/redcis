'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMounted } from '@/lib/hooks/use-mounted';
import { useRouteGuard } from '@/lib/hooks/use-route-guard';
import { HC_NAV_ITEMS } from '@/lib/constants/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { searchPatientByDni, FoundPatient } from '@/lib/api/identity';
import { Search, Loader2, CheckCircle2, User } from 'lucide-react';
import { toast } from 'sonner';

export default function SearchPage() {
  const { currentUser, isInitializing } = useAuth();
  const router = useRouter();
  const mounted = useMounted();
  useRouteGuard({ requiredRole: 'health_center' });

  const [dniValue, setDniValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundPatient, setFoundPatient] = useState<FoundPatient | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dniValue.trim()) {
      toast.error('Ingresa un DNI');
      return;
    }
    setLoading(true);
    try {
      const patient = await searchPatientByDni(dniValue);
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

  if (!mounted || isInitializing || !currentUser) return null;

  return (
    <DashboardLayout navItems={HC_NAV_ITEMS}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Buscar Paciente</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ingresa el DNI del paciente para acceder a su historial clínico
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
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="document">Número de DNI</Label>
                <div className="flex gap-2">
                  <Input
                    id="document"
                    type="text"
                    placeholder="Ej: 12345678"
                    value={dniValue}
                    onChange={(e) => setDniValue(e.target.value)}
                    disabled={loading}
                  />
                  <Button type="submit" disabled={loading} className="gap-2 shrink-0">
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />Buscando...</>
                    ) : (
                      <><Search className="w-4 h-4" />Buscar</>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Result */}
        {foundPatient && (
          <Card className="border-secondary/30 bg-secondary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-secondary">
                <CheckCircle2 className="w-4 h-4" />
                Paciente Encontrado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="font-semibold">{foundPatient.name}</p>
                  <p className="text-xs text-muted-foreground">
                    DNI: {foundPatient.dni}
                    {foundPatient.email && ` · ${foundPatient.email}`}
                  </p>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => router.push(`/dashboard/health-center/patient/${foundPatient.wallet}`)}
              >
                Ver Historial Clínico
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Guide */}
        <Card className="border-primary/15 bg-primary/3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Cómo Funciona la Búsqueda</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
              <li><span className="font-medium text-foreground">Ingresa el DNI</span> del paciente</li>
              <li><span className="font-medium text-foreground">Sistema verifica</span> que el paciente existe en la plataforma</li>
              <li>Si el paciente <span className="font-medium text-foreground">ha otorgado acceso</span> desde su panel, podrás ver su historial</li>
              <li><span className="font-medium text-foreground">Accede al historial</span> verificable en blockchain</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
