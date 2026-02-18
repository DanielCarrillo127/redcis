'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardLayout, SidebarNav } from '@/components/dashboard-layout';
import { useBlockchain } from '@/lib/contexts/blockchain-context';
import { ClinicalEventCard } from '@/components/clinical-event-card';
import { ClinicalEvent } from '@/lib/types';
import {
  FileText,
  Plus,
  Lock,
  BarChart3,
  Eye,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function PatientDashboard() {
  const { isAuthenticated, currentUser } = useAuth();
  const { getPatientEvents } = useBlockchain();
  const router = useRouter();
  const [events, setEvents] = useState<ClinicalEvent[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated || currentUser?.role !== 'patient') {
      router.push('/login');
    }
  }, [isAuthenticated, currentUser, router]);

  useEffect(() => {
    if (currentUser?.id) {
      const userEvents = getPatientEvents(currentUser.id);
      setEvents(userEvents);
    }
  }, [currentUser, getPatientEvents]);

  if (!mounted || !isAuthenticated || !currentUser) {
    return null;
  }

  const sidebarItems = [
    {
      href: '/dashboard/patient',
      label: 'Mi Historial',
      icon: <FileText className="w-5 h-5" />,
      active: true,
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
    },
  ];

  return (
    <DashboardLayout
      title="Mi Dashboard"
      sidebar={<SidebarNav items={sidebarItems} />}
    >
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-border bg-card hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Registros</p>
                <p className="text-3xl font-bold">{events.length}</p>
              </div>
              <FileText className="w-8 h-8 text-primary opacity-50" />
            </div>
          </div>

          <div className="p-4 rounded-lg border border-border bg-card hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accesos Activos</p>
                <p className="text-3xl font-bold">2</p>
              </div>
              <Eye className="w-8 h-8 text-accent opacity-50" />
            </div>
          </div>

          <div className="p-4 rounded-lg border border-border bg-card hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verificados</p>
                <p className="text-3xl font-bold">
                  {events.filter((e) => e.verified).length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-primary opacity-50" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Mi Historial Clínico</h2>
            <Link href="/dashboard/patient/add-record">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nuevo Registro
              </Button>
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Sin Registros Aún</h3>
              <p className="text-muted-foreground mb-6">
                No tienes eventos clínicos registrados. Comienza agregando tu primer registro.
              </p>
              <Link href="/dashboard/patient/add-record">
                <Button>
                  Agregar Primer Registro
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {events
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                )
                .map((event) => (
                  <Link
                    key={event.id}
                    href={`/dashboard/patient/event/${event.id}`}
                  >
                    <ClinicalEventCard event={event} showHealthCenter={true} />
                  </Link>
                ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
