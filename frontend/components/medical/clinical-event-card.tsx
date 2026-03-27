import type { LucideIcon } from 'lucide-react';
import type { ClinicalEvent } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { EVENT_TYPE_LABELS } from '@/lib/constants/event-types';
import {
  CheckCircle2, FileText, Clipboard, FlaskConical,
  Stethoscope, Pill, Syringe, ScanLine, Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const eventTypeIcons: Record<string, LucideIcon> = {
  consultation: Clipboard,
  diagnosis: Stethoscope,
  prescription: Pill,
  lab_result: FlaskConical,
  'lab-test': FlaskConical,
  imaging_report: ScanLine,
  imaging: ScanLine,
  procedure: FileText,
  vaccination: Syringe,
  progress_note: FileText,
  self_reported: FileText,
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
  const typeLabel = EVENT_TYPE_LABELS[event.eventType] ?? event.eventType;
  const Icon = eventTypeIcons[event.eventType] ?? FileText;
  const [year, month, day] = event.date.split('T')[0].split('-').map(Number);
  const eventDate = new Date(year, month - 1, day);

  return (
    <div
      className="group p-4 rounded-xl border border-border bg-card hover:shadow-md transition-all duration-200 cursor-pointer h-full flex flex-col"
      onClick={onClick}
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 group-hover:bg-primary/12 transition-colors">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{typeLabel}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {eventDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
        </div>
        {event.stellarTxHash ? (
          <button
            type="button"
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              window.open(
                `https://stellar.expert/explorer/testnet/tx/${event.stellarTxHash}`,
                '_blank', 'noopener,noreferrer',
              );
            }}
          >
            <Badge className="bg-secondary/10 text-secondary border border-secondary/30 hover:bg-secondary/20 text-xs gap-1 cursor-pointer">
              <CheckCircle2 className="w-3 h-3" />
              On-chain
            </Badge>
          </button>
        ) : event.verified ? (
          <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/20 shrink-0">
            <Clock className="w-3 h-3" />
            Anclando
          </Badge>
        ) : null}
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground line-clamp-2 mt-3 flex-1">{event.description}</p>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2">
        {showHealthCenter && event.healthCenterName && (
          <p className="text-xs text-muted-foreground truncate">
            <span className="font-medium text-foreground">Centro:</span> {event.healthCenterName}
          </p>
        )}
        <code className="text-xs font-mono text-muted-foreground/70 shrink-0 ml-auto">
          {event.hash.substring(0, 10)}...
        </code>
      </div>
    </div>
  );
}
