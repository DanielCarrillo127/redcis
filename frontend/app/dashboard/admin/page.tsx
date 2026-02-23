'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardLayout, SidebarNav } from '@/components/dashboard-layout';
import { RegisterHealthCenterModal } from '@/components/register-health-center-modal';
import { Button } from '@/components/ui/button';
import { Building2, Plus, AlertCircle, Users, FileText, Database, ShieldCheck, UserCheck } from 'lucide-react';
import { listHealthCenters, getStats, type HealthCenter, type Stats } from '@/lib/api';

export default function AdminDashboard() {
  const { isAuthenticated, currentUser, token, isInitializing } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [healthCenters, setHealthCenters] = useState<HealthCenter[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingHC, setLoadingHC] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only redirect after initialization is complete
    if (isInitializing) return;

    if (!isAuthenticated || !currentUser) {
      router.push('/login');
      return;
    }
    if (currentUser.role !== 'admin') {
      router.push('/login');
    }
  }, [isAuthenticated, currentUser, router, isInitializing]);

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
      const data = await listHealthCenters();
      setHealthCenters(data);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoadingHC(false);
    }
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const data = await getStats();
      setStats(data);
    } catch (err: unknown) {
      console.error('Error loading stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  if (!mounted || isInitializing || !isAuthenticated || !currentUser) return null;

  const sidebarItems = [
    {
      href: '/dashboard/admin',
      label: 'Centros de Salud',
      icon: <Building2 className="w-5 h-5" />,
      active: true,
    },
  ];

  return (
    <DashboardLayout title="Administración" sidebar={<SidebarNav items={sidebarItems} />}>
      <RegisterHealthCenterModal
        open={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onRegistered={async () => {
          setShowRegisterModal(false)
          await Promise.all([
            fetchHealthCenters(),
            fetchStats(),
          ])
        }}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Centros de Salud</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Gestiona los centros de salud pre-registrados en el sistema
            </p>
          </div>
          <Button className="gap-2" onClick={() => setShowRegisterModal(true)}>
            <Plus className="w-4 h-4" />
            Registrar Centro
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="p-4 rounded-lg border border-border bg-card hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pacientes</p>
                <p className="text-3xl font-bold">{stats?.totalPatients ?? 0}</p>
              </div>
              <Users className="w-8 h-8 text-primary opacity-50" />
            </div>
          </div>

          <div className="p-4 rounded-lg border border-border bg-card hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Centros de Salud</p>
                <p className="text-3xl font-bold">{stats?.totalHealthCenters ?? 0}</p>
              </div>
              <Building2 className="w-8 h-8 text-secondary opacity-50" />
            </div>
          </div>

          <div className="p-4 rounded-lg border border-border bg-card hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Registros Totales</p>
                <p className="text-3xl font-bold">{stats?.totalRecords ?? 0}</p>
              </div>
              <FileText className="w-8 h-8 text-accent opacity-50" />
            </div>
          </div>

          <div className="p-4 rounded-lg border border-border bg-card hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En Blockchain</p>
                <p className="text-3xl font-bold">{stats?.onChainRecords ?? 0}</p>
              </div>
              <Database className="w-8 h-8 text-primary opacity-50" />
            </div>
          </div>

          <div className="p-4 rounded-lg border border-border bg-card hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accesos Activos</p>
                <p className="text-3xl font-bold">{stats?.totalActiveGrants ?? 0}</p>
              </div>
              <ShieldCheck className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </div>
        </div>

        {/* Error */}
        {loadError && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {loadError}
          </div>
        )}

        {/* List */}
        {loadingHC ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground text-sm">
            Cargando...
          </div>
        ) : healthCenters.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Sin centros registrados</h3>
            <p className="text-muted-foreground mb-6">
              Registra el primer centro de salud para que pueda autenticarse.
            </p>
            <Button className="gap-2" onClick={() => setShowRegisterModal(true)}>
              <Plus className="w-4 h-4" />
              Registrar Centro
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">NIT</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">País</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Wallet</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                </tr>
              </thead>
              <tbody>
                {healthCenters.map((hc) => (
                  <tr key={hc.wallet} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{hc.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{hc.nit}</td>
                    <td className="px-4 py-3 text-muted-foreground">{hc.country}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {hc.wallet.slice(0, 5)}...{hc.wallet.slice(-5)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${hc.active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-muted text-muted-foreground'
                          }`}
                      >
                        {hc.active ? 'Activo' : 'Inactivo'}
                      </span>
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
