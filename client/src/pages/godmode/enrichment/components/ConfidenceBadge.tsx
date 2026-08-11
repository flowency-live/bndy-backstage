// Confidence badge for enrichment suggestions

import { cn } from '@/lib/utils';

interface ConfidenceBadgeProps {
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export default function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        confidence === 'HIGH' && 'bg-green-100 text-green-800',
        confidence === 'MEDIUM' && 'bg-amber-100 text-amber-800',
        confidence === 'LOW' && 'bg-red-100 text-red-800',
      )}
    >
      {confidence}
    </span>
  );
}
