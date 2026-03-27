'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { DashboardLayout } from '@/components/dashboard-layout';
import { StatCard } from '@/components/dashboard/stat-card';
import { SkeletonPage } from '@/components/dashboard/skeleton-list';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/contexts/auth-context';
import { useMounted } from '@/lib/hooks/use-mounted';
import { useRouteGuard } from '@/lib/hooks/use-route-guard';
import { ADMIN_NAV_ITEMS } from '@/lib/constants/navigation';
import { listHealthCenters, getStats, type HealthCenter, type Stats } from '@/lib/api';
import {
  Building2,
  Plus,
  AlertCircle,
  Users,
  FileText,
  Database,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { formatWallet } from '@/lib/utils/wallet';

const RegisterHealthCenterModal = dynamic(
  () => import('@/components/modals/register-health-center-modal').then((m) => m.RegisterHealthCenterModal),
  { ssr: false },
);

export default function AdminDashboard() {
  const { currentUser, token, isInitializing } = useAuth();
  const mounted = useMounted();
  useRouteGuard({ requiredRole: 'admin' });

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [healthCenters, setHealthCenters] = useState<HealthCenter[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingHC, setLoadingHC] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || currentUser?.role !== 'admin') return;
    fetchHealthCenters();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentUser?.role]);

  const fetchHealthCenters = async () => {
    setLoadingHC(true);
    setLoadError(null);
    try {
      setHealthCenters(await listHealthCenters());
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoadingHC(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStats(await getStats());
    } catch (err: unknown) {
      console.error('Error loading stats:', err);
    }
  };

  if (!mounted || isInitializing || !currentUser) return null;

  if (loadingHC && healthCenters.length === 0) {
    return (
      <DashboardLayout navItems={ADMIN_NAV_ITEMS}>
        <SkeletonPage />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={ADMIN_NAV_ITEMS}>
      <RegisterHealthCenterModal
        open={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onRegistered={async () => {
          setShowRegisterModal(false);
          await Promise.all([fetchHealthCenters(), fetchStats()]);
        }}
      />

      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Centros de Salud</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gestiona los centros de salud registrados en el sistema
            </p>
          </div>
          <Button size="sm" className="gap-2" onClick={() => setShowRegisterModal(true)}>
            <Plus className="w-4 h-4" />
            Registrar Centro
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Pacientes" value={stats?.totalPatients ?? 0} icon={Users} />
          <StatCard label="Centros de Salud" value={stats?.totalHealthCenters ?? 0} icon={Building2} variant="success" />
          <StatCard label="Registros" value={stats?.totalRecords ?? 0} icon={FileText} />
          <StatCard label="En Blockchain" value={stats?.onChainRecords ?? 0} icon={Database} />
          <StatCard label="Accesos Activos" value={stats?.totalActiveGrants ?? 0} icon={ShieldCheck} variant="success" />
        </div>

        {/* Error */}
        {loadError && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/8 border border-destructive/25 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {loadError}
          </div>
        )}

        {/* HC list */}
        {healthCenters.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-14 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/8 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-6 h-6 text-primary/60" />
            </div>
            <h3 className="text-base font-semibold mb-1">Sin centros registrados</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
              Registra el primer centro de salud para que pueda autenticarse.
            </p>
            <Button size="sm" className="gap-2" onClick={() => setShowRegisterModal(true)}>
              <Plus className="w-4 h-4" />
              Registrar Centro
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nombre</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">NIT</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">País</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Wallet</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {healthCenters.map((hc) => (
                  <tr key={hc.wallet} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-primary/8 flex items-center justify-center shrink-0">
                          <UserCheck className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="font-medium">{hc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{hc.nit}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{hc.country}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden sm:table-cell">
                      {formatWallet(hc.wallet)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={hc.active ? 'default' : 'secondary'}
                        className={hc.active ? 'bg-secondary/15 text-secondary border-secondary/25 hover:bg-secondary/20' : ''}
                      >
                        {hc.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
