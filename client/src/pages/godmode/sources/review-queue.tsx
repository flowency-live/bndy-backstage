import { useState, useEffect } from 'react';
import { ClipboardList, RefreshCw, AlertTriangle, User, MapPin, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getReviewItems,
  formatSourceName,
  type ReviewItem,
  type ReviewItemStatus,
  type ReviewItemEntityType,
} from '@/lib/services/source-runs-service';

export default function ReviewQueuePage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReviewItemStatus>('open');
  const [entityTypeFilter, setEntityTypeFilter] = useState<ReviewItemEntityType | 'all'>('all');

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReviewItems(statusFilter);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load review items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [statusFilter]);

  // Filter by entity type client-side
  const filteredItems = entityTypeFilter === 'all'
    ? items
    : items.filter(item => item.entityType === entityTypeFilter);

  // Group items by source
  const itemsBySource = new Map<string, ReviewItem[]>();
  for (const item of filteredItems) {
    const existing = itemsBySource.get(item.sourceId) || [];
    existing.push(item);
    itemsBySource.set(item.sourceId, existing);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-8 w-8" />
            Review Queue
          </h1>
          <p className="text-muted-foreground mt-1">
            Items requiring human review
            {filteredItems.length > 0 && ` (${filteredItems.length} items)`}
          </p>
        </div>
        <Button onClick={fetchItems} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as ReviewItemStatus)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="proposed">Proposed</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Type:</span>
          <Select
            value={entityTypeFilter}
            onValueChange={(value) => setEntityTypeFilter(value as ReviewItemEntityType | 'all')}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="artist">Artists</SelectItem>
              <SelectItem value="venue">Venues</SelectItem>
              <SelectItem value="event">Events</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="flex-1" />
        <div className="flex items-center gap-4 text-sm">
          <StatBadge
            icon={User}
            label="Artists"
            count={items.filter(i => i.entityType === 'artist').length}
          />
          <StatBadge
            icon={MapPin}
            label="Venues"
            count={items.filter(i => i.entityType === 'venue').length}
          />
          <StatBadge
            icon={Calendar}
            label="Events"
            count={items.filter(i => i.entityType === 'event').length}
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="p-6 border-destructive">
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!error && filteredItems.length === 0 && (
        <Card className="p-12 text-center">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium">No review items</p>
          <p className="text-sm text-muted-foreground mt-1">
            {statusFilter === 'open'
              ? 'All items have been reviewed.'
              : `No items with status "${statusFilter}".`}
          </p>
        </Card>
      )}

      {/* Items by Source */}
      {!error && filteredItems.length > 0 && (
        <div className="space-y-6">
          {Array.from(itemsBySource.entries()).map(([sourceId, sourceItems]) => (
            <Card key={sourceId} className="overflow-hidden">
              <div className="bg-muted px-4 py-3 border-b flex items-center justify-between">
                <h3 className="font-semibold">{formatSourceName(sourceId)}</h3>
                <Badge variant="secondary">{sourceItems.length}</Badge>
              </div>
              <div className="divide-y">
                {sourceItems.map((item) => (
                  <ReviewItemRow key={item.itemId} item={item} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Read-only notice */}
      <Card className="p-4 bg-muted/50 border-dashed">
        <p className="text-sm text-muted-foreground text-center">
          This is a read-only view. Actions (confirm/reject) will be available in the intelligence-pass HITL interface.
        </p>
      </Card>
    </div>
  );
}

interface ReviewItemRowProps {
  item: ReviewItem;
}

function ReviewItemRow({ item }: ReviewItemRowProps) {
  const [expanded, setExpanded] = useState(false);

  const EntityIcon = item.entityType === 'artist' ? User
    : item.entityType === 'venue' ? MapPin
    : Calendar;

  return (
    <div className="p-4">
      <div className="flex items-start gap-4">
        {/* Entity Icon */}
        <div className={cn(
          'p-2 rounded-lg',
          item.entityType === 'artist' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300' :
          item.entityType === 'venue' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' :
          'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
        )}>
          <EntityIcon className="h-5 w-5" />
        </div>

        {/* Item Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{item.entityName}</span>
            <Badge variant="outline" className="text-xs">
              {item.entityType}
            </Badge>
            <StatusBadge status={item.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{item.reason}</p>

          {/* Expandable candidate data */}
          {Object.keys(item.candidateData).length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-blue-600 hover:underline"
              >
                {expanded ? 'Hide' : 'Show'} candidate data
              </button>
              {expanded && (
                <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                  {JSON.stringify(item.candidateData, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Item ID */}
        <code className="text-xs text-muted-foreground bg-muted px-1 rounded">
          {(item.itemId || '').slice(0, 8)}
        </code>
      </div>
    </div>
  );
}

interface StatBadgeProps {
  icon: typeof User;
  label: string;
  count: number;
}

function StatBadge({ icon: Icon, label, count }: StatBadgeProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{count}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: ReviewItemStatus }) {
  const variants: Record<ReviewItemStatus, string> = {
    open: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    proposed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    applied: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', variants[status])}>
      {status}
    </span>
  );
}

function cn(...classes: (string | undefined | boolean)[]) {
  return classes.filter(Boolean).join(' ');
}
