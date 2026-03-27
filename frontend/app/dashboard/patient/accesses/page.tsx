'use client';

import { useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { SkeletonCardList } from '@/components/dashboard/skeleton-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/contexts/auth-context';
import { useMounted } from '@/lib/hooks/use-mounted';
import { useRouteGuard } from '@/lib/hooks/use-route-guard';
import { PATIENT_NAV_ITEMS } from '@/lib/constants/navigation';
import type { AccessPermission } from '@/lib/types';
import {
  getMyGrants,
  grantAccess as apiGrantAccess,
  revokeAccess as apiRevokeAccess,
  grantToAccessPermission,
} from '@/lib/api/access';
import {
  grantAccess as sorobanGrantAccess,
  revokeAccess as sorobanRevokeAccess,
} from '@/lib/services/soroban';
import { searchHealthCenters, HealthCenterSearchResult } from '@/lib/api/identity';
import {
  Eye,
  Trash2,
  Loader2,
  Search,
  Building2,
  CheckCircle2,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export default function AccessesPage() {
  const { currentUser, isInitializing } = useAuth();
  const mounted = useMounted();
  useRouteGuard({ requiredRole: 'individual' });

  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState(false);
  const [permissions, setPermissions] = useState<AccessPermission[]>([]);
  const [openDialog, setOpenDialog] = useState(false);

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
    const loadPermissions = async () => {
      if (!currentUser?.id) return;
      setLoading(true);
      try {
        const grants = await getMyGrants();
        setPermissions(grants.map(grantToAccessPermission));
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
        setSearchResults(await searchHealthCenters(searchQuery.trim()));
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

  const handleGrantAccess = async () => {
    if (!selectedCenter) {
      toast.error('Selecciona un centro de salud');
      return;
    }
    setGranting(true);
    try {
      const durationSeconds = formData.durationDays * 24 * 60 * 60;

      await apiGrantAccess({
        centerWallet: selectedCenter.wallet,
        permission: formData.permission,
        durationSeconds,
      });

      try {
        if (currentUser?.wallet) {
          await sorobanGrantAccess(currentUser.wallet, selectedCenter.wallet, durationSeconds);
        }
      } catch (sorobanError) {
        console.warn('Soroban grant failed (puede ser que el usuario canceló):', sorobanError);
      }

      toast.success(`Acceso otorgado a ${selectedCenter.name}`);
      setFormData({ permission: 'view', durationDays: 0 });
      setSearchQuery('');
      setSearchResults([]);
      setSelectedCenter(null);
      setOpenDialog(false);

      const grants = await getMyGrants();
      setPermissions(grants.map(grantToAccessPermission));
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      toast.error(axiosError.response?.data?.error || 'Error al otorgar acceso');
      console.error(error);
    } finally {
      setGranting(false);
    }
  };

  const handleRevokeAccess = async (healthCenterWallet: string, centerName: string) => {
    try {
      await apiRevokeAccess({ centerWallet: healthCenterWallet });

      try {
        if (currentUser?.wallet) {
          await sorobanRevokeAccess(currentUser.wallet, healthCenterWallet);
        }
      } catch (sorobanError) {
        console.warn('Soroban revoke failed:', sorobanError);
      }

      toast.success(`Acceso revocado a ${centerName}`);
      const grants = await getMyGrants();
      setPermissions(grants.map(grantToAccessPermission));
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      toast.error(axiosError.response?.data?.error || 'Error al revocar acceso');
      console.error(error);
    }
  };

  if (!mounted || isInitializing || !currentUser) return null;

  if (loading) {
    return (
      <DashboardLayout navItems={PATIENT_NAV_ITEMS}>
        <SkeletonCardList count={3} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={PATIENT_NAV_ITEMS}>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mis Accesos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Administra quién puede acceder a tu historial clínico
            </p>
          </div>
          <Dialog
            open={openDialog}
            onOpenChange={(open) => {
              setOpenDialog(open);
              if (!open) {
                setSearchQuery('');
                setSearchResults([]);
                setSelectedCenter(null);
                setFormData({ permission: 'view', durationDays: 0 });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
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

                  {!selectedCenter && searchResults.length > 0 && (
                    <div className="border border-border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                      {searchResults.map((center) => (
                        <button
                          key={center.wallet}
                          type="button"
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors"
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

                  {selectedCenter && (
                    <div className="flex items-center justify-between bg-secondary/8 border border-secondary/25 rounded-lg px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{selectedCenter.name}</p>
                          <p className="text-xs text-muted-foreground">NIT: {selectedCenter.nit}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
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
                    <p className="text-xs text-muted-foreground">
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
                  <p className="text-xs text-muted-foreground">Deja en 0 para acceso permanente</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="permission">Tipo de Acceso</Label>
                  <Select
                    value={formData.permission}
                    onValueChange={(value) =>
                      setFormData({ ...formData, permission: value as 'view' | 'add' })
                    }
                  >
                    <SelectTrigger id="permission">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">Solo lectura (Ver historial)</SelectItem>
                      <SelectItem value="add">Lectura y escritura (Ver y agregar registros)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 text-sm">
                  <p>
                    {formData.permission === 'view'
                      ? 'El centro podrá ver tu historial completo pero no podrá agregar nuevos registros.'
                      : 'El centro podrá ver tu historial y registrar nuevos eventos clínicos.'}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenDialog(false)} disabled={granting}>
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

        {/* Accesses list */}
        {permissions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-14 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/8 flex items-center justify-center mx-auto mb-4">
              <Eye className="w-6 h-6 text-primary/60" />
            </div>
            <h3 className="text-base font-semibold mb-1">Sin accesos otorgados</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Aún no has otorgado acceso a tu historial a ningún centro de salud.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {permissions.map((perm) => (
              <div
                key={perm.id}
                className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/8 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{perm.healthCenterName}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
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
                      {perm.expiresAt && (
                        <span>
                          Expira {formatDistanceToNow(new Date(perm.expiresAt), { addSuffix: true, locale: es })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className="bg-secondary/15 text-secondary border-secondary/25 hover:bg-secondary/20">
                    Activo
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                    onClick={() => handleRevokeAccess(perm.healthCenterWallet, perm.healthCenterName)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info card */}
        <Card className="border-primary/15 bg-primary/3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Gestión de Accesos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>Puedes otorgar permisos de lectura o lectura-escritura</li>
              <li>Cada acceso queda registrado en blockchain como auditoría</li>
              <li>Puedes revocar acceso en cualquier momento</li>
              <li>Los permisos pueden tener fecha de expiración automática</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
