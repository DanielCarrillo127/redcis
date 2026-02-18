import { ClinicalEvent } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, FileText, Clipboard } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const eventTypeLabels: Record<string, { label: string; color: string }> = {
  consultation: { label: 'Consulta', color: 'bg-blue-50 text-blue-700 border border-blue-200' },
  diagnosis: { label: 'Diagnóstico', color: 'bg-red-50 text-red-700 border border-red-200' },
  prescription: { label: 'Prescripción', color: 'bg-green-50 text-green-700 border border-green-200' },
  'lab-test': { label: 'Prueba Lab', color: 'bg-purple-50 text-purple-700 border border-purple-200' },
  imaging: { label: 'Imagenología', color: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  procedure: { label: 'Procedimiento', color: 'bg-pink-50 text-pink-700 border border-pink-200' },
  vaccination: { label: 'Vacuna', color: 'bg-primary/10 text-primary border border-primary/30' },
  other: { label: 'Otro', color: 'bg-gray-50 text-gray-700 border border-gray-200' },
};

const eventTypeIcons: Record<string, any> = {
  consultation: Clipboard,
  diagnosis: FileText,
  'lab-test': FileText,
  imaging: FileText,
  procedure: FileText,
  prescription: FileText,
  vaccination: CheckCircle2,
  other: FileText,
};

interface ClinicalEventCardProps {
  event: ClinicalEvent;
  showHealthCenter?: boolean;
  onClick?: () => void;
}

export function ClinicalEventCard({
  event,
  showHealthCenter = true,
  onClick,
}: ClinicalEventCardProps) {
  const eventType = eventTypeLabels[event.eventType] || eventTypeLabels.other;
  const IconComponent = eventTypeIcons[event.eventType] || FileText;
  const eventDate = new Date(event.date);
  const formattedDate = formatDistanceToNow(eventDate, { addSuffix: true, locale: es });

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg bg-muted">
              <IconComponent className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">{eventType.label}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {eventDate.toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
          {event.verified && (
            <CheckCircle2 className="w-5 h-5 text-secondary flex-shrink-0" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm line-clamp-2">{event.description}</p>

        <div className="space-y-2">
          {showHealthCenter && (
            <div className="text-xs">
              <span className="text-muted-foreground">Centro: </span>
              <span className="font-medium">{event.healthCenterName}</span>
            </div>
          )}

          <div className="text-xs">
            <span className="text-muted-foreground">Hash: </span>
            <code className="font-mono text-xs bg-muted px-2 py-1 rounded break-all">
              {event.hash.substring(0, 16)}...
            </code>
          </div>

          {event.document && (
            <div className="text-xs">
              <span className="text-muted-foreground">Documento: </span>
              <span className="font-medium">{event.document.name}</span>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {formattedDate}
          </span>
          {event.previousHash && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
              En cadena
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
