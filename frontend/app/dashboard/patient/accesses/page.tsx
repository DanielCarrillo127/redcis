'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useBlockchain } from '@/lib/contexts/blockchain-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardLayout, SidebarNav } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AccessPermission } from '@/lib/types';
import { FileText, Plus, Lock, BarChart3, Eye, Trash2, Dot } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export default function AccessesPage() {
  const { isAuthenticated, currentUser } = useAuth();
  const { getPatientPermissions, grantAccess, revokeAccess } = useBlockchain();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [permissions, setPermissions] = useState<AccessPermission[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    healthCenterId: '',
    healthCenterName: '',
    permission: 'view' as 'view' | 'add',
  });

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated || currentUser?.role !== 'patient') {
      router.push('/login');
    }
  }, [isAuthenticated, currentUser, router]);

  useEffect(() => {
    if (currentUser?.id) {
      const userPermissions = getPatientPermissions(currentUser.id);
      setPermissions(userPermissions);
    }
  }, [currentUser, getPatientPermissions]);

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
      active: true,
    },
    {
      href: '/dashboard/patient/profile',
      label: 'Perfil',
      icon: <BarChart3 className="w-5 h-5" />,
    },
  ];

  const handleGrantAccess = () => {
    if (!formData.healthCenterName.trim()) {
      toast.error('Ingresa el nombre del centro de salud');
      return;
    }

    grantAccess(
      currentUser!.id,
      formData.healthCenterId || `hc-${Date.now()}`,
      formData.healthCenterName,
      formData.permission
    );

    toast.success(`Acceso otorgado a ${formData.healthCenterName}`);
    setFormData({
      healthCenterId: '',
      healthCenterName: '',
      permission: 'view',
    });
    setOpenDialog(false);

    // Refresh permissions
    const updated = getPatientPermissions(currentUser!.id);
    setPermissions(updated);
  };

  const handleRevokeAccess = (permissionId: string) => {
    revokeAccess(permissionId);
    toast.success('Acceso revocado');

    // Refresh permissions
    const updated = getPatientPermissions(currentUser!.id);
    setPermissions(updated);
  };

  if (!mounted || !isAuthenticated || !currentUser) {
    return null;
  }

  return (
    <DashboardLayout
      title="Administrar Accesos"
      sidebar={<SidebarNav items={sidebarItems} />}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Mis Accesos</h1>
            <p className="text-muted-foreground">
              Administra quién puede acceder a tu historial clínico
            </p>
          </div>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Otorgar Acceso
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Otorgar Acceso a Centro de Salud</DialogTitle>
                <DialogDescription>
                  Selecciona un centro de salud y el tipo de acceso que deseas conceder
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="centerName">Nombre del Centro de Salud</Label>
                  <Input
                    id="centerName"
                    placeholder="Ej: Hospital Central, Clínica Privada, etc."
                    value={formData.healthCenterName}
                    onChange={(e) =>
                      setFormData({ ...formData, healthCenterName: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="permission">Tipo de Acceso</Label>
                  <Select
                    value={formData.permission}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        permission: value as 'view' | 'add',
                      })
                    }
                  >
                    <SelectTrigger id="permission">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">
                        Solo lectura (Ver historial)
                      </SelectItem>
                      <SelectItem value="add">
                        Lectura y escritura (Ver y agregar registros)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm">
                  <p className="font-semibold mb-1">Tipo de acceso:</p>
                  <p>
                    {formData.permission === 'view'
                      ? 'El centro podrá ver tu historial completo pero no podrá agregar nuevos registros.'
                      : 'El centro podrá ver tu historial y registrar nuevos eventos clínicos.'}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setOpenDialog(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleGrantAccess}>
                  Otorgar Acceso
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Active Accesses */}
        <div>
          <h2 className="text-xl font-bold mb-4">Accesos Activos</h2>
          {permissions.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Sin Accesos Otorgados</h3>
                <p className="text-muted-foreground mb-6">
                  Aún no has otorgado acceso a tu historial a ningún centro de salud
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {permissions.map((perm) => (
                <Card key={perm.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">
                          {perm.healthCenterName}
                        </h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>
                            Tipo de acceso:{' '}
                            <span className="font-medium text-foreground">
                              {perm.permission === 'view'
                                ? 'Solo lectura'
                                : 'Lectura y escritura'}
                            </span>
                          </p>
                          <p>
                            Otorgado:{' '}
                            {formatDistanceToNow(
                              new Date(perm.grantedAt),
                              {
                                addSuffix: true,
                                locale: es,
                              }
                            )}
                          </p>
                          {perm.expiresAt && (
                            <p>
                              Expira:{' '}
                              {formatDistanceToNow(
                                new Date(perm.expiresAt),
                                {
                                  addSuffix: true,
                                  locale: es,
                                }
                              )}
                            </p>
                          )}
                        </div>

                        <div className="mt-3 pt-3 border-t border-border">
                          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-900">
                            Activo
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeAccess(perm.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Information */}
        <Card className="border-accent/20 bg-accent/5">
          <CardHeader>
            <CardTitle>Cómo Funciona la Gestión de Accesos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Tienes control total sobre quién puede acceder a tu información médica. Cada acceso otorgado queda registrado en blockchain.
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-accent mt-1"><Dot /></span>
                Puedes otorgar permisos de lectura (solo ver) o lectura-escritura (ver y agregar)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-1"><Dot /></span>
                Cada acceso deja una auditoría completa
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-1"><Dot /></span>
                Puedes revocar acceso en cualquier momento
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-1"><Dot /></span>
                Los permisos pueden tener fecha de expiración automática
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
