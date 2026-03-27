'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ClinicalEventCard } from '@/components/medical/clinical-event-card';
import { SkeletonCardList } from '@/components/dashboard/skeleton-list';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/contexts/auth-context';
import { useMounted } from '@/lib/hooks/use-mounted';
import { useRouteGuard } from '@/lib/hooks/use-route-guard';
import { HC_NAV_ITEMS } from '@/lib/constants/navigation';
import type { ClinicalEvent } from '@/lib/types';
import {
  getPatientRecords, createRecord,
  recordToClinicalEvent, type PatientProfile,
} from '@/lib/api/records';
import { anchorRecordOnChain, BlockchainRecordError } from '@/lib/api/blockchain-records';
import { ArrowLeft, FileText, Plus, Loader2, Upload, User } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PatientViewPage() {
  const { currentUser, isInitializing } = useAuth();
  const router = useRouter();
  const mounted = useMounted();
  useRouteGuard({ requiredRole: 'health_center' });

  const params = useParams();
  const patientWallet = params.id as string;

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

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [events],
  );

  const refreshRecords = async () => {
    const response = await getPatientRecords(patientWallet, { limit: 100 });
    setEvents(response.data.map(recordToClinicalEvent));
    if (response.patient) setPatient(response.patient);
    if (response.permission) setPermission(response.permission);
  };

  useEffect(() => {
    const loadRecords = async () => {
      if (!currentUser?.id || !patientWallet) return;
      setLoading(true);
      try {
        await refreshRecords();
      } catch (error: unknown) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 403) {
          toast.error('No tienes acceso al historial de este paciente');
          setTimeout(() => router.push('/dashboard/health-center/search'), 1000);
        } else {
          console.error('Error loading records:', error);
        }
      } finally {
        setLoading(false);
      }
    };
    loadRecords();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, patientWallet]);

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
      setFormData({ recordType: 'diagnosis', date: new Date().toISOString().split('T')[0], description: '', details: '' });
      setSelectedFile(null);
      await refreshRecords();
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Error al registrar el evento');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || isInitializing || !currentUser) return null;

  return (
    <DashboardLayout navItems={HC_NAV_ITEMS}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap gap-3 items-start justify-between">
          <div>
            <Link href="/dashboard/health-center/accesses">
              <Button variant="ghost" size="sm" className="gap-2 -ml-2 mb-2">
                <ArrowLeft className="w-4 h-4" />
                Volver
              </Button>
            </Link>

            <h1 className="text-2xl font-bold tracking-tight">Historial del Paciente</h1>

            {patient && (
              <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                {patient.name && (
                  <p><span className="font-medium text-foreground">Nombre:</span> {patient.name}</p>
                )}
                {patient.dni && (
                  <p><span className="font-medium text-foreground">DNI:</span> {patient.dni}</p>
                )}
                {patient.email && (
                  <p><span className="font-medium text-foreground">Email:</span> {patient.email}</p>
                )}
                <p>
                  <span className="font-medium text-foreground">Wallet:</span>{' '}
                  <code className="font-mono bg-muted px-2 py-0.5 rounded text-xs">{patientWallet}</code>
                </p>
              </div>
            )}
          </div>

          {permission === 'add' && (
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
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
                      onValueChange={(value) => setFormData({ ...formData, recordType: value })}
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
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe el evento clínico..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="details">Notas Adicionales</Label>
                    <Textarea
                      id="details"
                      placeholder="Información complementaria..."
                      value={formData.details}
                      onChange={(e) => setFormData({ ...formData, details: e.target.value })}
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
                  <Button variant="outline" onClick={() => setOpenDialog(false)} disabled={submitting}>
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

        {/* Records */}
        {loading ? (
          <SkeletonCardList count={4} />
        ) : sortedEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-14 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/8 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-primary/60" />
            </div>
            <h3 className="text-base font-semibold mb-1">Sin eventos registrados</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              No hay eventos registrados para este paciente
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedEvents.map((event) => (
              <Link key={event.id} href={`/dashboard/record/${event.id}`}>
                <ClinicalEventCard event={event} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
