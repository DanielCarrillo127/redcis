'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/contexts/auth-context';
import { useMounted } from '@/lib/hooks/use-mounted';
import { useRouteGuard } from '@/lib/hooks/use-route-guard';
import { PATIENT_NAV_ITEMS } from '@/lib/constants/navigation';
import { createRecord } from '@/lib/api/records';
import { anchorRecordOnChain, BlockchainRecordError } from '@/lib/api/blockchain-records';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function AddRecordPage() {
  const { currentUser, isInitializing } = useAuth();
  const router = useRouter();
  const mounted = useMounted();
  useRouteGuard({ requiredRole: 'individual' });

  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    recordType: 'self_reported',
    date: new Date().toISOString().split('T')[0],
    description: '',
    details: '',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const record = await createRecord({
        recordType: formData.recordType,
        source: 'patient',
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

      router.push('/dashboard/patient');
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      toast.error(axiosError.response?.data?.error || 'Error al agregar el registro');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || isInitializing || !currentUser) return null;

  return (
    <DashboardLayout navItems={PATIENT_NAV_ITEMS}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nuevo Registro Clínico</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Crea un registro que será verificable en blockchain Stellar
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Detalles del Evento</CardTitle>
            <CardDescription>
              Completa los datos del evento clínico. Será registrado con hash SHA-256.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
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
                    <SelectItem value="self_reported">Auto-Reportado</SelectItem>
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
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Describe el evento clínico, síntomas, hallazgos, etc."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={5}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="details">Detalles Adicionales (Opcional)</Label>
                <Textarea
                  id="details"
                  placeholder="Información adicional, recomendaciones, etc."
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Adjuntar Documento (Opcional)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                  {selectedFile && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5 shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      {selectedFile.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Formatos permitidos: PDF, JPG, PNG, WEBP (máx. 10MB)
                </p>
              </div>

              <div className="rounded-lg bg-primary/5 border border-primary/15 p-4">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Información importante:</span>{' '}
                  Este registro será guardado de forma segura y se puede sincronizar con blockchain
                  Stellar para verificación inmutable.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    'Crear Registro'
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
