import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ListCardProps {
  children: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  variant?: 'compact' | 'standard';
  leftBorderColor?: string;
  className?: string;
}

/**
 * ListCard - Standardized card component for list items
 *
 * Replaces custom card implementations with consistent padding and styling.
 *
 * **Variants:**
 * - 'compact' (p-4): List items, venue cards, gig cards
 * - 'standard' (p-6): Regular cards, detailed content
 *
 * **Features:**
 * - Optional left border accent (4px colored border)
 * - Selected state with orange border
 * - Hover effects when clickable
 * - Consistent shadow and border radius
 *
 * @param children - Card content
 * @param onClick - Click handler (makes card clickable)
 * @param selected - Selected state (orange border)
 * @param variant - Padding variant (default: 'standard')
 * @param leftBorderColor - Left border color (4px accent)
 * @param className - Additional classes
 *
 * @example
 * ```tsx
 * // Gig card with left border accent
 * <ListCard
 *   variant="compact"
 *   leftBorderColor="hsl(24, 95%, 53%)"
 *   onClick={() => navigate(`/gigs/${gig.id}`)}
 * >
 *   <div className="flex items-center gap-3">
 *     <Avatar />
 *     <div>
 *       <h3>{gig.title}</h3>
 *       <p>{gig.venue}</p>
 *     </div>
 *   </div>
 * </ListCard>
 *
 * // Venue card (compact)
 * <ListCard variant="compact" onClick={() => navigate(`/venues/${venue.id}`)}>
 *   <div className="flex items-center gap-2">
 *     <Building className="h-7 w-7" />
 *     <span>{venue.name}</span>
 *   </div>
 * </ListCard>
 *
 * // Song card with selection
 * <ListCard
 *   selected={selectedSongs.includes(song.id)}
 *   onClick={() => toggleSelection(song.id)}
 * >
 *   <div className="flex items-center">
 *     <img src={song.albumArt} className="w-12 h-12" />
 *     <div>{song.title}</div>
 *   </div>
 * </ListCard>
 * ```
 */
export function ListCard({
  children,
  onClick,
  selected = false,
  variant = 'standard',
  leftBorderColor,
  className
}: ListCardProps) {
  const padding = variant === 'compact' ? 'p-4' : 'p-6';

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-card rounded-lg border transition-all',
        onClick && 'cursor-pointer hover:shadow-md',
        selected ? 'border-orange-500 border-2' : 'border-border',
        leftBorderColor && 'border-l-4',
        padding,
        className
      )}
      style={leftBorderColor ? { borderLeftColor: leftBorderColor } : undefined}
    >
      {children}
    </div>
  );
}
