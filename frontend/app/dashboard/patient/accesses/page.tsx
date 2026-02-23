'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { DashboardLayout, SidebarNav } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { getMyGrants, grantAccess as apiGrantAccess, revokeAccess as apiRevokeAccess, grantToAccessPermission } from '@/lib/api/access';
import { grantAccess as sorobanGrantAccess, revokeAccess as sorobanRevokeAccess } from '@/lib/services/soroban';
import { searchHealthCenters, HealthCenterSearchResult } from '@/lib/api/identity';
import { FileText, Plus, Lock, BarChart3, Eye, Trash2, Dot, Loader2, Search, Building2, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export default function AccessesPage() {
  const { isAuthenticated, currentUser, isInitializing } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState(false);
  const [permissions, setPermissions] = useState<AccessPermission[]>([]);
  const [openDialog, setOpenDialog] = useState(false);

  // Estado de búsqueda del modal
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HealthCenterSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<HealthCenterSearchResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formData, setFormData] = useState({
    permission: 'view' as 'view' | 'add',
    durationDays: 0,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only redirect after initialization is complete
    if (isInitializing) return;

    if (!isAuthenticated || currentUser?.role !== 'individual') {
      router.push('/login');
    }
  }, [isAuthenticated, currentUser, router, isInitializing]);

  useEffect(() => {
    const loadPermissions = async () => {
      if (!currentUser?.id) return;

      setLoading(true);
      try {
        const grants = await getMyGrants();
        const perms = grants.map(grantToAccessPermission);
        setPermissions(perms);
      } catch (error) {
        console.error('Error loading permissions:', error);
        toast.error('Error al cargar los permisos');
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [currentUser]);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchHealthCenters(searchQuery.trim());
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

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

  const handleGrantAccess = async () => {
    if (!selectedCenter) {
      toast.error('Selecciona un centro de salud');
      return;
    }

    setGranting(true);
    try {
      const durationSeconds = formData.durationDays * 24 * 60 * 60;

      // 1. Otorgar en backend
      await apiGrantAccess({
        centerWallet: selectedCenter.wallet,
        permission: formData.permission,
        durationSeconds,
      });

      // 2. Otorgar en Soroban (firma con Freighter)
      try {
        if (currentUser?.wallet) {
          const txHash = await sorobanGrantAccess(
            currentUser.wallet,
            selectedCenter.wallet,
            durationSeconds
          );
        }
      } catch (sorobanError) {
        console.warn('Soroban grant failed (puede ser que el usuario canceló):', sorobanError);
        // No bloqueamos si falla Soroban
      }

      toast.success(`Acceso otorgado a ${selectedCenter.name}`);
      setFormData({ permission: 'view', durationDays: 0 });
      setSearchQuery('');
      setSearchResults([]);
      setSelectedCenter(null);
      setOpenDialog(false);

      // Refresh permissions
      const grants = await getMyGrants();
      const perms = grants.map(grantToAccessPermission);
      setPermissions(perms);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al otorgar acceso');
      console.error(error);
    } finally {
      setGranting(false);
    }
  };

  const handleRevokeAccess = async (healthCenterId: string, centerName: string) => {
    try {
      // 1. Revocar en backend
      await apiRevokeAccess({ centerWallet: healthCenterId });

      // 2. Revocar en Soroban (firma con Freighter)
      try {
        if (currentUser?.wallet) {
          const txHash = await sorobanRevokeAccess(currentUser.wallet, healthCenterId);
        }
      } catch (sorobanError) {
        console.warn('Soroban revoke failed:', sorobanError);
      }

      toast.success(`Acceso revocado a ${centerName}`);

      // Refresh permissions
      const grants = await getMyGrants();
      const perms = grants.map(grantToAccessPermission);
      setPermissions(perms);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al revocar acceso');
      console.error(error);
    }
  };

  if (!mounted || isInitializing || !isAuthenticated || !currentUser) {
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout
        title="Administrar Accesos"
        sidebar={<SidebarNav items={sidebarItems} />}
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
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
          <Dialog open={openDialog} onOpenChange={(open) => {
            setOpenDialog(open);
            if (!open) {
              setSearchQuery('');
              setSearchResults([]);
              setSelectedCenter(null);
              setFormData({ permission: 'view', durationDays: 0 });
            }
          }}>
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
                  <Label htmlFor="searchQuery">Buscar Centro de Salud</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="searchQuery"
                      placeholder="Nombre o NIT del centro..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSelectedCenter(null);
                      }}
                      className="pl-9"
                      disabled={!!selectedCenter}
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {/* Search results */}
                  {!selectedCenter && searchResults.length > 0 && (
                    <div className="border hover:border-primary hover:bg-[#CCDDEB] rounded-md divide-y max-h-48 overflow-y-auto">
                      {searchResults.map((center) => (
                        <button
                          key={center.wallet}
                          type="button"
                          className="w-full flex items-center gap-3 px-3 py-2 text-left cursor-pointer"
                          onClick={() => {
                            setSelectedCenter(center);
                            setSearchResults([]);
                          }}
                        >
                          <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{center.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              NIT: {center.nit} · {center.country}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Selected center */}
                  {selectedCenter && (
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md px-3 py-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{selectedCenter.name}</p>
                          <p className="text-xs text-muted-foreground">NIT: {selectedCenter.nit}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="text-muted-foreground h-auto py-1 px-2 bg-gray-200 hover:bg-gray-200 hover:scale-105 cursor-pointer"
                        onClick={() => {
                          setSelectedCenter(null);
                          setSearchQuery('');
                        }}
                      >
                        ✕
                      </Button>
                    </div>
                  )}

                  {!selectedCenter && searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No se encontraron centros de salud con ese nombre o NIT.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="durationDays">Duración del Acceso (días)</Label>
                  <Input
                    id="durationDays"
                    type="number"
                    min="0"
                    placeholder="0 = sin expiración"
                    value={formData.durationDays}
                    onChange={(e) =>
                      setFormData({ ...formData, durationDays: parseInt(e.target.value) || 0 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Deja en 0 para acceso permanente
                  </p>
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
                  disabled={granting}
                >
                  Cancelar
                </Button>

                <Button onClick={handleGrantAccess} disabled={granting || !selectedCenter}>
                  {granting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Otorgando...
                    </>
                  ) : (
                    'Otorgar Acceso'
                  )}
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
                  <CardContent className="">
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
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRevokeAccess(perm.healthCenterWallet, perm.healthCenterName)}
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
