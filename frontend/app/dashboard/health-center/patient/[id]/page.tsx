'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardLayout, SidebarNav } from '@/components/dashboard-layout';
import { useBlockchain } from '@/lib/contexts/blockchain-context';
import { ClinicalEvent } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClinicalEventCard } from '@/components/clinical-event-card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Search,
  Plus,
  Eye,
  BarChart3,
  Users,
  ArrowLeft,
  FileText,
  Loader2,
} from 'lucide-react';
import { EventType } from '@/lib/types';
import { toast } from 'sonner';
import Link from 'next/link';

export default function PatientViewPage() {
  const { isAuthenticated, currentUser } = useAuth();
  const { getAccessibleEvents, createEvent } = useBlockchain();
  const router = useRouter();
  const params = useParams();
  const patientId = params.id as string;

  const [mounted, setMounted] = useState(false);
  const [events, setEvents] = useState<ClinicalEvent[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    eventType: 'consultation' as EventType,
    date: new Date().toISOString().split('T')[0],
    description: '',
    details: '',
  });

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated || currentUser?.role !== 'healthcenter') {
      router.push('/login');
    }
  }, [isAuthenticated, currentUser, router]);

  useEffect(() => {
    if (currentUser?.id && patientId) {
      const accessibleEvents = getAccessibleEvents(patientId, currentUser.id);
      setEvents(accessibleEvents);
    }
  }, [currentUser, patientId, getAccessibleEvents]);

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
    },
    {
      href: '/dashboard/health-center/accesses',
      label: 'Accesos Otorgados',
      icon: <Users className="w-5 h-5" />,
    },
  ];

  const handleAddEvent = async () => {
    if (!formData.description.trim()) {
      toast.error('Describe el evento clínico');
      return;
    }

    setLoading(true);
    try {
      await createEvent(
        patientId,
        currentUser!.id,
        currentUser!.name,
        formData.eventType,
        new Date(formData.date).toISOString(),
        formData.description,
        currentUser!.id,
        formData.details ? { notes: formData.details } : undefined
      );

      toast.success('Evento registrado en blockchain');
      setOpenDialog(false);
      setFormData({
        eventType: 'consultation',
        date: new Date().toISOString().split('T')[0],
        description: '',
        details: '',
      });

      // Refresh events
      const updated = getAccessibleEvents(patientId, currentUser!.id);
      setEvents(updated);
    } catch (error) {
      toast.error('Error al registrar el evento');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !isAuthenticated || !currentUser) {
    return null;
  }

  return (
    <DashboardLayout
      title="Historial del Paciente"
      sidebar={<SidebarNav items={sidebarItems} />}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/dashboard/health-center">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Volver
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold">Historial del Paciente</h1>
            <p className="text-muted-foreground mt-1">
              ID: <code className="font-mono bg-muted px-2 py-1 rounded">{patientId}</code>
            </p>
          </div>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Registrar Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Evento Clínico</DialogTitle>
                <DialogDescription>
                  Crea un nuevo registro que será inmediatamente verificable en blockchain
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="eventType">Tipo de Evento</Label>
                  <Select
                    value={formData.eventType}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        eventType: value as EventType,
                      })
                    }
                  >
                    <SelectTrigger id="eventType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultation">Consulta</SelectItem>
                      <SelectItem value="diagnosis">Diagnóstico</SelectItem>
                      <SelectItem value="prescription">Prescripción</SelectItem>
                      <SelectItem value="lab-test">Prueba Laboratorio</SelectItem>
                      <SelectItem value="imaging">Imagenología</SelectItem>
                      <SelectItem value="procedure">Procedimiento</SelectItem>
                      <SelectItem value="vaccination">Vacunación</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Fecha del Evento</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe el evento clínico..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description: e.target.value,
                      })
                    }
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="details">Notas Adicionales</Label>
                  <Textarea
                    id="details"
                    placeholder="Información complementaria..."
                    value={formData.details}
                    onChange={(e) =>
                      setFormData({ ...formData, details: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setOpenDialog(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleAddEvent} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    'Registrar Evento'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Events */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Eventos Clínicos</h2>
          {events.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Sin Eventos</h3>
                <p className="text-muted-foreground">
                  No hay eventos registrados para este paciente
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {events
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                )
                .map((event) => (
                  <ClinicalEventCard key={event.id} event={event} />
                ))}
            </div>
          )}
        </div>

        {/* Blockchain Information */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Información de Blockchain</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Todos los eventos están protegidos por:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                Hash SHA-256 único e imposible de alterar
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                Cadena de referencias verificables
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                Timestamps y metadata completa
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                Auditoría completa de accesos
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
