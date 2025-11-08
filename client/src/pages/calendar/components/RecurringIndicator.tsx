import { Repeat } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatRecurringPattern } from '../utils/recurringCalculations';
import type { RecurringRule } from '../utils/recurringCalculations';

interface RecurringIndicatorProps {
  recurring: RecurringRule;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

/**
 * Displays a recurring event indicator with icon and tooltip
 * Shows the recurring pattern in human-readable format
 */
export function RecurringIndicator({
  recurring,
  size = 'sm',
  showTooltip = true,
}: RecurringIndicatorProps) {
  const patternText = formatRecurringPattern(recurring);

  const iconSizeClass = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }[size];

  const icon = (
    <Repeat
      className={`${iconSizeClass} text-muted-foreground`}
      aria-label="Recurring event"
    />
  );

  if (!showTooltip) {
    return icon;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center cursor-help">{icon}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{patternText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
