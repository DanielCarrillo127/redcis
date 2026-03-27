import { ClinicalEvent } from '@/lib/types';
import { CheckCircle2 } from 'lucide-react';

interface TimelineProps {
  events: ClinicalEvent[];
  selectedEventId?: string;
  onSelectEvent?: (eventId: string) => void;
}

export function Timeline({ events, selectedEventId, onSelectEvent }: TimelineProps) {
  if (events.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>No hay eventos registrados aún</p>
      </div>
    );
  }

  // Sort events by date descending
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-4">
      {sortedEvents.map((event, index) => (
        <div
          key={event.id}
          className={`relative flex gap-4 pb-8 last:pb-0 cursor-pointer group transition-opacity ${
            selectedEventId === event.id ? 'opacity-100' : 'opacity-75 hover:opacity-100'
          }`}
          onClick={() => onSelectEvent?.(event.id)}
        >
          {/* Timeline line */}
          {index < sortedEvents.length - 1 && (
            <div className="absolute left-6 top-12 bottom-0 w-1 bg-border group-hover:bg-primary transition-colors"></div>
          )}

          {/* Timeline dot */}
          <div className="relative flex-shrink-0 pt-1">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              selectedEventId === event.id
                ? 'bg-primary text-primary-foreground shadow-lg scale-110'
                : 'bg-muted text-muted-foreground group-hover:bg-primary/20'
            }`}>
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          {/* Event content */}
          <div className={`flex-1 pt-2 p-4 rounded-lg transition-all ${
            selectedEventId === event.id
              ? 'bg-primary/10 border border-primary/30'
              : 'bg-muted/50 border border-transparent group-hover:bg-muted'
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4 className="font-semibold text-sm">
                  {getEventTypeLabel(event.eventType)}
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
                <span className="text-xs bg-secondary/20 text-secondary px-2 py-1 rounded whitespace-nowrap">
                  Verificado
                </span>
              )}
            </div>
            <p className="text-sm mt-2 line-clamp-2">{event.description}</p>
            {event.previousHash && (
              <p className="text-xs text-muted-foreground mt-2">
                Centro: {event.healthCenterName}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function getEventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    consultation: 'Consulta',
    diagnosis: 'Diagnóstico',
    prescription: 'Prescripción',
    'lab-test': 'Prueba Laboratorio',
    imaging: 'Imagenología',
    procedure: 'Procedimiento',
    vaccination: 'Vacunación',
    other: 'Otro Evento',
  };
  return labels[type] || 'Evento';
}
