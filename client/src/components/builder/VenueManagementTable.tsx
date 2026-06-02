import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface BuilderVenueWithDetails {
  id: string;
  builder_id: string;
  venue_id: string;
  selection: 'auto' | 'manual' | 'excluded';
  featured: boolean;
  created_at: string;
  venue: {
    id: string;
    name: string;
    address?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  event_count: number;
  last_event_date: string | null;
  standard_fee: string | null;
  payment_terms: string | null;
  notes: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

export type SortField = 'name' | 'event_count' | 'last_event_date' | 'standard_fee' | 'payment_terms';
export type SortOrder = 'asc' | 'desc';

export interface VenueManagementTableProps {
  venues: BuilderVenueWithDetails[];
  onVenueClick: (venue: BuilderVenueWithDetails) => void;
  sortBy: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  isLoading?: boolean;
}

// Format date to UK format DD/MM/YYYY
function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

interface SortableHeaderProps {
  field: SortField;
  currentSortBy: SortField;
  currentSortOrder: SortOrder;
  onSort: (field: SortField) => void;
  children: React.ReactNode;
}

function SortableHeader({
  field,
  currentSortBy,
  currentSortOrder,
  onSort,
  children,
}: SortableHeaderProps) {
  const isSorted = currentSortBy === field;
  const sortIndicator = isSorted ? (
    currentSortOrder === 'asc' ? (
      <ChevronUp className="h-4 w-4 ml-1 inline" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1 inline" />
    )
  ) : null;

  return (
    <TableHead
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onSort(field)}
      data-sorted={isSorted ? currentSortOrder : undefined}
    >
      {children}
      {sortIndicator}
    </TableHead>
  );
}

function TableSkeleton() {
  return (
    <div data-testid="table-skeleton" className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-12 flex-1" />
        </div>
      ))}
    </div>
  );
}

export default function VenueManagementTable({
  venues,
  onVenueClick,
  sortBy,
  sortOrder,
  onSort,
  isLoading = false,
}: VenueManagementTableProps) {
  if (isLoading) {
    return <TableSkeleton />;
  }

  if (venues.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No venues selected. Go to Venue Coverage to select venues.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader
            field="name"
            currentSortBy={sortBy}
            currentSortOrder={sortOrder}
            onSort={onSort}
          >
            Name
          </SortableHeader>
          <SortableHeader
            field="event_count"
            currentSortBy={sortBy}
            currentSortOrder={sortOrder}
            onSort={onSort}
          >
            Events
          </SortableHeader>
          <SortableHeader
            field="last_event_date"
            currentSortBy={sortBy}
            currentSortOrder={sortOrder}
            onSort={onSort}
          >
            Last Event
          </SortableHeader>
          <SortableHeader
            field="standard_fee"
            currentSortBy={sortBy}
            currentSortOrder={sortOrder}
            onSort={onSort}
          >
            Fee
          </SortableHeader>
          <SortableHeader
            field="payment_terms"
            currentSortBy={sortBy}
            currentSortOrder={sortOrder}
            onSort={onSort}
          >
            Payment
          </SortableHeader>
        </TableRow>
      </TableHeader>
      <TableBody>
        {venues.map((venue) => (
          <TableRow
            key={venue.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onVenueClick(venue)}
          >
            <TableCell>
              <div className="flex items-center gap-2">
                <div>
                  <div className="font-medium">{venue.venue.name}</div>
                  {venue.venue.city && (
                    <div className="text-sm text-muted-foreground">{venue.venue.city}</div>
                  )}
                </div>
                {venue.featured && (
                  <Badge variant="secondary" className="ml-2">
                    Featured
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell>{venue.event_count}</TableCell>
            <TableCell>{formatDate(venue.last_event_date)}</TableCell>
            <TableCell>{venue.standard_fee || '-'}</TableCell>
            <TableCell>{venue.payment_terms || '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
