'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardLayout, SidebarNav } from '@/components/dashboard-layout';
import { ClinicalEvent } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClinicalEventCard } from '@/components/clinical-event-card';
import { getPatientRecords, createRecord, recordToClinicalEvent, PatientProfile } from '@/lib/api/records';
import { anchorRecordOnChain, BlockchainRecordError } from '@/lib/api/blockchain-records';
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
  Upload,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function PatientViewPage() {
  const { isAuthenticated, currentUser } = useAuth();
  const router = useRouter();
  const params = useParams();
  const patientWallet = params.id as string;

  const [mounted, setMounted] = useState(false);
  const [events, setEvents] = useState<ClinicalEvent[]>([]);
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [permission, setPermission] = useState<'view' | 'add' | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    recordType: 'diagnosis',
    date: new Date().toISOString().split('T')[0],
    description: '',
    details: '',
  });

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated || currentUser?.role !== 'health_center') {
      router.push('/login');
    }
  }, [isAuthenticated, currentUser, router]);

  useEffect(() => {
    const loadRecords = async () => {
      if (!currentUser?.id || !patientWallet) return;

      setLoading(true);
      try {
        const response = await getPatientRecords(patientWallet, { limit: 100 });
        const clinicalEvents = response.data.map(recordToClinicalEvent);
        setEvents(clinicalEvents);
        if (response.patient) setPatient(response.patient);
        if (response.permission) setPermission(response.permission);
      } catch (error: any) {
        if (error.response?.status === 403) {
          toast.error('No tienes acceso al historial de este paciente');
          setTimeout(() => {
            router.push('/dashboard/health-center/search')
          }, 1000);
        } else {
          console.error('Error loading records:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    loadRecords();
  }, [currentUser, patientWallet]);

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
    {
      href: '/dashboard/health-center/profile',
      label: 'Perfil',
      icon: <User className="w-5 h-5" />,
    },
  ];

  const handleAddEvent = async () => {
    if (!formData.description.trim()) {
      toast.error('Describe el evento clínico');
      return;
    }

    setSubmitting(true);
    try {
      const record = await createRecord({
        patientWallet,
        recordType: formData.recordType,
        source: 'health_center',
        description: formData.description,
        eventDate: new Date(formData.date).toISOString(),
        details: formData.details ? { notes: formData.details } : undefined,
        file: selectedFile || undefined,
      });

      toast.info('Registro creado. Firmando en blockchain con Freighter...');

      try {
        await anchorRecordOnChain(record._id, currentUser!.wallet);
        toast.success('Registro anclado en blockchain correctamente');
      } catch (chainErr) {
        if (chainErr instanceof BlockchainRecordError) {
          if (chainErr.code === 'USER_REJECTED') {
            toast.warning('Firma cancelada. El registro fue guardado sin anclar en blockchain.');
          } else {
            toast.error(`Error al anclar en blockchain: ${chainErr.message}`);
          }
        } else {
          toast.error('Error inesperado al anclar en blockchain');
        }
      }

      setOpenDialog(false);
      setFormData({
        recordType: 'diagnosis',
        date: new Date().toISOString().split('T')[0],
        description: '',
        details: '',
      });
      setSelectedFile(null);

      // Refresh records
      const response = await getPatientRecords(patientWallet, { limit: 100 });
      setEvents(response.data.map(recordToClinicalEvent));
      if (response.patient) setPatient(response.patient);
      if (response.permission) setPermission(response.permission);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al registrar el evento');
      console.error(error);
    } finally {
      setSubmitting(false);
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
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/dashboard/health-center/accesses">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Volver
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold">
              {'Historial del Paciente'}
            </h1>
            <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
              {patient?.name && (
                <p> <span className="font-medium text-foreground">Nombre:</span> {patient?.name}</p>
              )}
              {patient?.dni && (
                <p> <span className="font-medium text-foreground">DNI:</span> {patient?.dni}</p>
              )}
              {patient?.email && (
                <p> <span className="font-medium text-foreground">Email:</span> {patient?.email}</p>
              )}
              <p> <span className="font-medium text-foreground"> Wallet:</span> <code className="font-mono bg-muted px-2 py-1 rounded text-xs">{patientWallet}</code></p>
            </div>
          </div>
          {permission === 'add' && (
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
                  <Label htmlFor="recordType">Tipo de Registro</Label>
                  <Select
                    value={formData.recordType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, recordType: value })
                    }
                  >
                    <SelectTrigger id="recordType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diagnosis">Diagnóstico</SelectItem>
                      <SelectItem value="prescription">Prescripción</SelectItem>
                      <SelectItem value="lab_result">Resultado de Laboratorio</SelectItem>
                      <SelectItem value="imaging_report">Reporte de Imagenología</SelectItem>
                      <SelectItem value="procedure">Procedimiento</SelectItem>
                      <SelectItem value="vaccination">Vacunación</SelectItem>
                      <SelectItem value="progress_note">Nota de Progreso</SelectItem>
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

                <div className="space-y-2">
                  <Label htmlFor="file">Adjuntar Documento (Opcional)</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Upload className="w-3 h-3" /> {selectedFile.name}
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setOpenDialog(false)}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button onClick={handleAddEvent} disabled={submitting}>
                  {submitting ? (
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
          )}
        </div>

        {/* Events */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Registros Clínicos</h2>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : events.length === 0 ? (
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                )
                .map((event) => (
                  <Link key={event.id} href={`/dashboard/record/${event.id}`}>
                    <ClinicalEventCard event={event} />
                  </Link>
                ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
