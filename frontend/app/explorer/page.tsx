'use client';

import { useEffect, useState } from 'react';
import { ClinicalEvent } from '@/lib/types';
import { getMyRecords, recordToClinicalEvent } from '@/lib/api/records';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { ChevronLeft, Copy, CheckCircle2, Hash, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BlockchainExplorerPage() {
  const [events, setEvents] = useState<ClinicalEvent[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<ClinicalEvent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
    // El explorer muestra registros on-chain — por ahora solo los propios del usuario
    // En producción esto podría ser un endpoint público de exploración
    getMyRecords({ limit: 200 })
      .then((response) => setEvents(response.data.map(recordToClinicalEvent)))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredEvents = events.filter(
    (event) =>
      event.id.includes(searchTerm) ||
      event.hash.includes(searchTerm) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.patientId.includes(searchTerm) ||
      event.healthCenterName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background to-muted">
      {/* Fixed background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent opacity-10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  Atrás
                </Button>
              </Link>
              <h1 className="text-xl font-bold">Blockchain Explorer</h1>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Explorar Blockchain</CardTitle>
              <CardDescription>
                Visualiza los registros clínicos verificables del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Busca por Hash, ID, Paciente, Centro de Salud..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total de Eventos</p>
                  <p className="text-3xl font-bold">{events.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Verificados</p>
                  <p className="text-3xl font-bold">
                    {events.filter((e) => e.verified).length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Resultados</p>
                  <p className="text-3xl font-bold">{filteredEvents.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Events List */}
            <div className="lg:col-span-2">
              {filteredEvents.length === 0 ? (
                <Card>
                  <CardContent className="pt-12 pb-12 text-center">
                    <Hash className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">Sin Eventos</h3>
                    <p className="text-muted-foreground">
                      No hay eventos registrados aún en la blockchain
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredEvents
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                    .map((event, index) => (
                      <Card
                        key={event.id}
                        className={`cursor-pointer transition-all hover:shadow-lg ${
                          selectedEvent?.id === event.id
                            ? 'ring-2 ring-primary'
                            : ''
                        }`}
                        onClick={() => setSelectedEvent(event)}
                      >
                        <CardContent className="pt-4">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-xs text-muted-foreground font-mono mb-1">
                                  #{index + 1}
                                </p>
                                <h4 className="font-semibold">
                                  {event.eventType}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(event.date).toLocaleDateString('es-ES', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                              {event.verified && (
                                <CheckCircle2 className="w-5 h-5 text-secondary flex shrink-0" />
                              )}
                            </div>
                            <p className="text-xs font-mono text-muted-foreground break-all">
                              {event.hash.substring(0, 20)}...
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>

            {/* Event Details */}
            <div>
              {selectedEvent ? (
                <Card className="sticky top-20">
                  <CardHeader>
                    <CardTitle className="text-base">Detalles del Evento</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        TIPO DE EVENTO
                      </p>
                      <p className="font-semibold capitalize">
                        {selectedEvent.eventType}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        HASH SHA-256
                      </p>
                      <div className="flex gap-2">
                        <code className="flex-1 text-xs bg-muted px-2 py-1 rounded font-mono break-all">
                          {selectedEvent.hash}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(selectedEvent.hash)}
                        >
                          {copied ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {selectedEvent.previousHash && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          HASH ANTERIOR
                        </p>
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all block">
                          {selectedEvent.previousHash.substring(0, 32)}...
                        </code>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        PACIENTE
                      </p>
                      <p className="font-mono text-sm">{selectedEvent.patientId}</p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        CENTRO REGISTRADOR
                      </p>
                      <p className="font-medium">{selectedEvent.healthCenterName}</p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        FECHA
                      </p>
                      <p>
                        {new Date(selectedEvent.date).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        TIMESTAMP (UNIX)
                      </p>
                      <p className="font-mono text-sm">{selectedEvent.timestamp}</p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        ESTADO
                      </p>
                      <div className="flex gap-2">
                        {selectedEvent.verified && (
                          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-900">
                            Verificado
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        DESCRIPCIÓN
                      </p>
                      <p className="text-sm text-foreground">
                        {selectedEvent.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-12 pb-12 text-center">
                    <p className="text-sm text-muted-foreground">
                      Selecciona un evento para ver detalles
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-background/50 backdrop-blur-sm mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-sm text-muted-foreground">
            <p>Blockchain Explorer - Visualización de eventos verificables</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
