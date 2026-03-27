'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ClinicalEventCard } from '@/components/medical/clinical-event-card';
import { StatCard } from '@/components/dashboard/stat-card';
import { SkeletonPage } from '@/components/dashboard/skeleton-list';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/contexts/auth-context';
import { useMounted } from '@/lib/hooks/use-mounted';
import { useRouteGuard } from '@/lib/hooks/use-route-guard';
import { PATIENT_NAV_ITEMS } from '@/lib/constants/navigation';
import type { ClinicalEvent } from '@/lib/types';
import { getMyRecords, recordToClinicalEvent } from '@/lib/api/records';
import { getMyGrants } from '@/lib/api/access';
import { Eye, FileText, CheckCircle2, Plus } from 'lucide-react';

const CompleteProfileModal = dynamic(
  () => import('@/components/modals/complete-profile-modal').then((m) => m.CompleteProfileModal),
  { ssr: false },
);

export default function PatientDashboard() {
  const { currentUser, isInitializing } = useAuth();
  const mounted = useMounted();
  useRouteGuard({ requiredRole: 'individual' });

  const [events, setEvents] = useState<ClinicalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGrants, setActiveGrants] = useState(0);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    if (currentUser?.isNewUser) setShowProfileModal(true);
  }, [currentUser?.isNewUser]);

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser?.id) return;
      setLoading(true);
      try {
        const recordsResponse = await getMyRecords({ limit: 100 });
        setEvents(recordsResponse.data.map(recordToClinicalEvent));
        const grants = await getMyGrants();
        setActiveGrants(grants.filter((g) => g.active).length);
      } catch (error) {
        console.error('Error loading patient data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentUser]);

  const verifiedCount = useMemo(
    () => events.filter((e) => e.verified).length,
    [events],
  );

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [events],
  );

  if (!mounted || isInitializing || !currentUser) return null;

  if (loading) {
    return (
      <DashboardLayout navItems={PATIENT_NAV_ITEMS}>
        <SkeletonPage />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={PATIENT_NAV_ITEMS}>
      <CompleteProfileModal
        open={showProfileModal}
        onCompleted={() => setShowProfileModal(false)}
      />

      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mi Historial Clínico</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Todos tus registros médicos verificables
            </p>
          </div>
          <Link href="/dashboard/patient/add-record">
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Registro
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Accesos Activos"
            value={activeGrants}
            icon={Eye}
            description="Centros con acceso autorizado"
          />
          <StatCard
            label="Total Registros"
            value={events.length}
            icon={FileText}
            description="Eventos clínicos registrados"
          />
          <StatCard
            label="Verificados en Blockchain"
            value={verifiedCount}
            icon={CheckCircle2}
            variant="success"
            description="Registros con hash on-chain"
          />
        </div>

        {/* Records list */}
        {sortedEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-14 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/8 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-primary/60" />
            </div>
            <h3 className="text-base font-semibold mb-1">Sin registros aún</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
              No tienes eventos clínicos registrados. Comienza agregando tu primer registro.
            </p>
            <Link href="/dashboard/patient/add-record">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Agregar primer registro
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedEvents.map((event) => (
              <Link key={event.id} href={`/dashboard/record/${event.id}`}>
                <ClinicalEventCard event={event} showHealthCenter />
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
