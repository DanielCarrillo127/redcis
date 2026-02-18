'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useBlockchain } from '@/lib/contexts/blockchain-context';
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
import { EventType } from '@/lib/types';
import { FileText, Plus, Lock, BarChart3, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AddRecordPage() {
  const { isAuthenticated, currentUser } = useAuth();
  const { createEvent } = useBlockchain();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    eventType: 'consultation' as EventType,
    date: new Date().toISOString().split('T')[0],
    description: '',
    details: '',
  });

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated || currentUser?.role !== 'patient') {
      router.push('/login');
    }
  }, [isAuthenticated, currentUser, router]);

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
      await createEvent(
        currentUser!.id,
        'healthcenter-001',
        'Hospital San Carlos',
        formData.eventType,
        new Date(formData.date).toISOString(),
        formData.description,
        currentUser!.id,
        formData.details ? { notes: formData.details } : undefined
      );

      toast.success('Registro agregado correctamente');
      router.push('/dashboard/patient');
    } catch (error) {
      toast.error('Error al agregar el registro');
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
                <Label htmlFor="eventType">Tipo de Evento</Label>
                <Select
                  value={formData.eventType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, eventType: value as EventType })
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

              <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Información importante:</span> Este registro será asignado al{' '}
                  <strong>Hospital San Carlos</strong> como centro registrador. En la versión final, podrás seleccionar el centro que registra el evento.
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
