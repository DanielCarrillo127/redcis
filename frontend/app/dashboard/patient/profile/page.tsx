'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardLayout, SidebarNav } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Lock, BarChart3, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { isAuthenticated, currentUser } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated || currentUser?.role !== 'patient') {
      router.push('/login');
    }
  }, [isAuthenticated, currentUser, router]);

  const sidebarItems = [
    {
      href: '/dashboard/patient',
      label: 'Mi Historial',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      href: '/dashboard/patient/add-record',
      label: 'Agregar Registro',
      icon: <Plus className="w-5 h-5" />,
    },
    {
      href: '/dashboard/patient/accesses',
      label: 'Accesos',
      icon: <Lock className="w-5 h-5" />,
    },
    {
      href: '/dashboard/patient/profile',
      label: 'Perfil',
      icon: <BarChart3 className="w-5 h-5" />,
      active: true,
    },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!mounted || !isAuthenticated || !currentUser) {
    return null;
  }

  return (
    <DashboardLayout
      title="Mi Perfil"
      sidebar={<SidebarNav items={sidebarItems} />}
    >
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold mb-2">Mi Perfil</h1>
          <p className="text-muted-foreground">
            Información de tu cuenta en la plataforma
          </p>
        </div>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
            <CardDescription>
              Detalles de tu cuenta en HistoriaClínica.Web3
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Nombre Completo
                </label>
                <p className="text-lg font-semibold mt-1">{currentUser.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Documento de Identidad (DNI)
                </label>
                <p className="text-lg font-semibold mt-1">{currentUser.document}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Rol
                </label>
                <div className="mt-1">
                  <Badge variant="secondary">Paciente</Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Email
                </label>
                <p className="text-lg font-semibold mt-1">
                  {currentUser.email || 'No configurado'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Information */}
        <Card>
          <CardHeader>
            <CardTitle>Información de Blockchain</CardTitle>
            <CardDescription>
              Datos de tu wallet simulada y conexión blockchain
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  User ID (Blockchain)
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 px-3 py-2 rounded bg-muted text-sm font-mono">
                    {currentUser.id}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(currentUser.id)}
                  >
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Wallet Simulada (Web3)
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 px-3 py-2 rounded bg-muted text-sm font-mono">
                    {currentUser.wallet}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(currentUser.wallet)}
                  >
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Esta es una wallet simulada para propósitos de demostración MVP
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Information */}
        <Card className="border-accent/20 bg-accent/5">
          <CardHeader>
            <CardTitle>Seguridad y Privacidad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-secondary flex shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Datos Encriptados</p>
                  <p className="text-muted-foreground">
                    Tu información está almacenada localmente y protegida
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-secondary flex shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Hash Verificable</p>
                  <p className="text-muted-foreground">
                    Cada registro tiene un hash SHA-256 único e inmodificable
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-secondary flex shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Control Total</p>
                  <p className="text-muted-foreground">
                    Solo tú controlas quién accede a tu información
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-secondary flex shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Auditoría Completa</p>
                  <p className="text-muted-foreground">
                    Todos los accesos quedan registrados en blockchain
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
