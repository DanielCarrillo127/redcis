import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  variant?: 'default' | 'success' | 'warning';
  className?: string;
}

const variantStyles = {
  default: 'text-primary bg-primary/8',
  success: 'text-secondary bg-secondary/8',
  warning: 'text-amber-500 bg-amber-500/8',
};

export function StatCard({
  label,
  value,
  icon: Icon,
  description,
  variant = 'default',
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'group relative p-5 rounded-xl border border-border bg-card hover:shadow-md transition-all duration-200',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
            {label}
          </p>
          <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div
          className={cn(
            'shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110',
            variantStyles[variant],
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
