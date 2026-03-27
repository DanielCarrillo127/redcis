'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMounted } from '@/lib/hooks/use-mounted';
import { StatCard } from '@/components/dashboard/stat-card';
import type { ClinicalEvent } from '@/lib/types';
import { EVENT_TYPE_LABELS } from '@/lib/constants/event-types';
import { getMyRecords, recordToClinicalEvent } from '@/lib/api/records';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import {
  ChevronLeft, Copy, CheckCircle2, Hash,
  Loader2, FileText, Search, Clock,
} from 'lucide-react';
import { toast } from 'sonner';

export default function BlockchainExplorerPage() {
  const mounted = useMounted();
  const [events, setEvents] = useState<ClinicalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<ClinicalEvent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
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

  const filteredEvents = useMemo(
    () =>
      events.filter(
        (e) =>
          e.id.includes(searchTerm) ||
          e.hash.includes(searchTerm) ||
          e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.patientId.includes(searchTerm) ||
          e.healthCenterName.toLowerCase().includes(searchTerm.toLowerCase()),
      ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [events, searchTerm],
  );

  const verifiedCount = useMemo(() => events.filter((e) => e.verified).length, [events]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary opacity-8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-secondary opacity-8 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ChevronLeft className="w-4 h-4" />
                Inicio
              </Button>
            </Link>
            <span className="text-muted-foreground/40">|</span>
            <h1 className="text-base font-semibold">Blockchain Explorer</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page title */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Explorador de Registros</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visualiza registros clínicos verificables en la red
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total Eventos" value={events.length} icon={FileText} description="Registros en el sistema" />
          <StatCard label="Verificados" value={verifiedCount} icon={CheckCircle2} variant="success" description="Anclados en blockchain" />
          <StatCard label="Resultados" value={filteredEvents.length} icon={Search} description="Coinciden con búsqueda" />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Busca por Hash, ID, descripción, centro de salud..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List */}
            <div className="lg:col-span-2">
              {filteredEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-14 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/8 flex items-center justify-center mx-auto mb-4">
                    <Hash className="w-6 h-6 text-primary/60" />
                  </div>
                  <h3 className="text-base font-semibold mb-1">Sin eventos</h3>
                  <p className="text-sm text-muted-foreground">
                    No hay eventos registrados aún en la blockchain
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredEvents.map((event, i) => (
                    <div
                      key={event.id}
                      className={`p-4 rounded-xl border bg-card cursor-pointer transition-all duration-150 hover:shadow-md ${
                        selectedEvent?.id === event.id
                          ? 'ring-2 ring-primary border-primary/30'
                          : 'border-border'
                      }`}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-muted-foreground/60">#{i + 1}</span>
                            <span className="text-sm font-medium truncate">
                              {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {new Date(event.date).toLocaleDateString('es-ES', {
                              year: 'numeric', month: 'short', day: 'numeric',
                            })}
                          </p>
                          <code className="text-xs font-mono text-muted-foreground/60 mt-1 block">
                            {event.hash.substring(0, 24)}...
                          </code>
                        </div>
                        {event.verified ? (
                          <Badge className="bg-secondary/10 text-secondary border border-secondary/30 text-xs gap-1 shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            On-chain
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs gap-1 text-muted-foreground shrink-0">
                            <Clock className="w-3 h-3" />
                            Pendiente
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Detail panel */}
            <div>
              {selectedEvent ? (
                <div className="sticky top-20 rounded-xl border border-border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-semibold">Detalles del Evento</h3>

                  {[
                    { label: 'Tipo', value: EVENT_TYPE_LABELS[selectedEvent.eventType] ?? selectedEvent.eventType },
                    { label: 'Fecha', value: new Date(selectedEvent.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) },
                    { label: 'Paciente', value: selectedEvent.patientId, mono: true },
                    { label: 'Centro', value: selectedEvent.healthCenterName },
                    { label: 'Timestamp', value: String(selectedEvent.timestamp), mono: true },
                  ].map(({ label, value, mono }) => (
                    <div key={label}>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
                      <p className={`text-sm ${mono ? 'font-mono break-all' : ''}`}>{value}</p>
                    </div>
                  ))}

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Hash SHA-256</p>
                    <div className="flex gap-2 items-start">
                      <code className="flex-1 text-xs bg-muted px-2 py-1.5 rounded font-mono break-all">
                        {selectedEvent.hash}
                      </code>
                      <Button variant="ghost" size="sm" className="shrink-0" onClick={() => copyToClipboard(selectedEvent.hash)}>
                        {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {selectedEvent.previousHash && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Hash Anterior</p>
                      <code className="text-xs bg-muted px-2 py-1.5 rounded font-mono break-all block">
                        {selectedEvent.previousHash.substring(0, 32)}...
                      </code>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Estado</p>
                    {selectedEvent.verified ? (
                      <Badge className="bg-secondary/10 text-secondary border border-secondary/30 gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Verificado on-chain
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground gap-1">
                        <Clock className="w-3 h-3" />
                        Pendiente
                      </Badge>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Descripción</p>
                    <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    Selecciona un evento para ver sus detalles
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border/40 bg-background/50 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-xs text-muted-foreground">
          Blockchain Explorer · Redcis — Registros verificables en Stellar Testnet
        </div>
      </footer>
    </div>
  );
}
