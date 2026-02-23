'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardLayout, SidebarNav } from '@/components/dashboard-layout';
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
import { createRecord } from '@/lib/api/records';
import { anchorRecordOnChain, BlockchainRecordError } from '@/lib/api/blockchain-records';
import { FileText, Plus, Lock, BarChart3, Loader2, Upload, Link2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AddRecordPage() {
  const { isAuthenticated, currentUser, isInitializing } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
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
      active: true,
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
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al agregar el registro');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || isInitializing || !isAuthenticated || !currentUser) {
    return null;
  }

  return (
    <DashboardLayout
      title="Agregar Registro"
      sidebar={<SidebarNav items={sidebarItems} />}
    >
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Nuevo Evento Clínico</h1>
          <p className="text-muted-foreground">
            Crea un nuevo registro que será inmediatamente verificable en blockchain
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
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Describe el evento clínico, síntomas, hallazgos, etc."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, details: e.target.value })
                  }
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Adjuntar Documento (Opcional)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                  {selectedFile && (
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      {selectedFile.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Formatos permitidos: PDF, JPG, PNG, WEBP (máx. 10MB)
                </p>
              </div>

              <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Información importante:</span> Este registro será guardado de forma segura y se puede sincronizar con blockchain Stellar para verificación inmutable.
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    'Crear Registro'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
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
