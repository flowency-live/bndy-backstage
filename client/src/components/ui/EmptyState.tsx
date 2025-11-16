import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * EmptyState - Consistent empty state component
 *
 * Use when a list, table, or section has no data to display.
 * Provides visual feedback and optional action button.
 *
 * **Features:**
 * - Centered layout with icon
 * - Descriptive text
 * - Optional action button (e.g., "Add First Item")
 * - Dashed border for empty state indication
 * - Large padding (p-12) for prominence
 *
 * @param icon - Icon component (Lucide icon or custom)
 * @param title - Primary message (text-lg font-semibold)
 * @param description - Optional secondary message (text-sm muted)
 * @param action - Optional action button or link
 * @param className - Additional classes
 *
 * @example
 * ```tsx
 * import { Calendar } from 'lucide-react';
 *
 * <EmptyState
 *   icon={<Calendar className="h-12 w-12" />}
 *   title="No gigs scheduled"
 *   description="Create your first gig to get started"
 *   action={<Button onClick={onCreate}>Add Gig</Button>}
 * />
 *
 * // Minimal (no icon or action)
 * <EmptyState
 *   title="No results found"
 *   description="Try adjusting your filters"
 * />
 *
 * // Success state (custom icon color)
 * <EmptyState
 *   icon={<CheckCircle className="h-12 w-12 text-green-500" />}
 *   title="All caught up!"
 *   description="You have no pending tasks"
 * />
 * ```
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={cn(
      'bg-card border border-dashed border-border rounded-lg p-12 text-center',
      className
    )}>
      {icon && (
        <div className="flex justify-center mb-4 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
