// Godmode › Review Queue.
//
// Presentation layer for review items raised by source runs. Evidence renders
// as a readable field grid (URLs become links) instead of raw JSON, items
// group by source, and the type/status filters are one-click chips.
//
// Resolution actions (confirm/reject → Learned Rule) land with the
// BUILD-BRIEF-02 backend (raise/resolve/get_learned_rules); the UI here is
// deliberately structured so those buttons drop into each row's footer.

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  MapPin,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  formatSourceName,
  type ReviewItem,
  type ReviewItemStatus,
} from '@/lib/services/source-runs-service';
import { useReviewItems } from '../lib/queries';
import { FacetChips, GodmodePageHeader } from '../components/godmode-ui';

const STATUSES: ReviewItemStatus[] = ['open', 'proposed', 'applied', 'rejected'];

const STATUS_STYLES: Record<ReviewItemStatus, string> = {
  open: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  proposed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  applied: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const ENTITY_ICONS = { artist: User, venue: MapPin, event: Calendar } as const;

const ENTITY_ICON_STYLES = {
  artist: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300',
  venue: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
  event: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300',
} as const;

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/** Render candidateData as a readable field grid; nested objects fall back to JSON. */
function EvidenceGrid({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;

  const scalars = entries.filter(([, v]) => v === null || ['string', 'number', 'boolean'].includes(typeof v));
  const complex = entries.filter(([, v]) => !(v === null || ['string', 'number', 'boolean'].includes(typeof v)));

  return (
    <div className="mt-2 space-y-2">
      <div className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 rounded-md bg-muted/50 p-3 text-xs">
        {scalars.map(([key, value]) => (
          <div key={key} className="contents">
            <span className="font-medium text-muted-foreground">{key}</span>
            <span className="break-all">
              {value === null || value === '' ? (
                <span className="text-muted-foreground/60">—</span>
              ) : typeof value === 'string' && isUrl(value) ? (
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {value}
                </a>
              ) : (
                String(value)
              )}
            </span>
          </div>
        ))}
      </div>
      {complex.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Full payload ({complex.map(([k]) => k).join(', ')})
          </summary>
          <pre className="mt-1 overflow-x-auto rounded bg-muted p-2">
            {JSON.stringify(Object.fromEntries(complex), null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

function ReviewItemRow({ item }: { item: ReviewItem }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const EntityIcon = ENTITY_ICONS[item.entityType] ?? User;
  const hasEvidence = Object.keys(item.candidateData ?? {}).length > 0;

  return (
    <div className="px-4 py-3">
      <div
        className={cn('flex items-start gap-3', hasEvidence && 'cursor-pointer')}
        onClick={() => hasEvidence && setExpanded((e) => !e)}
      >
        <div className={cn('mt-0.5 rounded-md p-1.5', ENTITY_ICON_STYLES[item.entityType])}>
          <EntityIcon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{item.entityName}</span>
            <span className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">{item.entityType}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', STATUS_STYLES[item.status])}>
              {item.status}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{item.reason}</p>
          {expanded && hasEvidence && <EvidenceGrid data={item.candidateData} />}
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground"
            title="Copy item ID"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard?.writeText(item.itemId);
              toast({ title: 'Item ID copied', description: item.itemId });
            }}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          {hasEvidence &&
            (expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ))}
        </div>
      </div>
    </div>
  );
}

export default function ReviewQueuePage() {
  const [status, setStatus] = useState<ReviewItemStatus>('open');
  const [entityFacet, setEntityFacet] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  const itemsQuery = useReviewItems(status);
  const items = itemsQuery.data ?? [];

  const sources = useMemo(
    () => Array.from(new Set(items.map((i) => i.sourceId))).sort(),
    [items],
  );

  // A source filter carried over from another status may not exist here —
  // treat it as 'all' rather than silently showing an empty page.
  const effectiveSourceFilter = sources.includes(sourceFilter) ? sourceFilter : 'all';

  const filtered = items.filter(
    (item) =>
      (entityFacet === 'all' || item.entityType === entityFacet) &&
      (effectiveSourceFilter === 'all' || item.sourceId === effectiveSourceFilter),
  );

  const bySource = useMemo(() => {
    const map = new Map<string, ReviewItem[]>();
    for (const item of filtered) {
      const list = map.get(item.sourceId) ?? [];
      list.push(item);
      map.set(item.sourceId, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const entityFacets = [
    { value: 'all', label: 'All types', count: items.length },
    { value: 'artist', label: 'Artists', count: items.filter((i) => i.entityType === 'artist').length },
    { value: 'venue', label: 'Venues', count: items.filter((i) => i.entityType === 'venue').length },
    { value: 'event', label: 'Events', count: items.filter((i) => i.entityType === 'event').length },
  ];

  return (
    <div className="space-y-4">
      <GodmodePageHeader
        icon={ClipboardList}
        title="Review Queue"
        count={`${filtered.length.toLocaleString()} ${status}`}
        isFetching={itemsQuery.isFetching}
        onRefresh={() => itemsQuery.refetch()}
      />

      <div className="flex flex-wrap items-center gap-3">
        {/* Status segmented control */}
        <div className="flex overflow-hidden rounded-md border">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setStatus(s); setSourceFilter('all'); }}
              className={cn(
                'px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                status === s ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <FacetChips facets={entityFacets} active={entityFacet} onChange={setEntityFacet} />

        {sources.length > 1 && (
          <select
            value={effectiveSourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            <option value="all">All sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {formatSourceName(s)}
              </option>
            ))}
          </select>
        )}
      </div>

      {itemsQuery.isError && (
        <Card className="border-destructive p-4">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {(itemsQuery.error as Error).message}
          </div>
        </Card>
      )}

      {!itemsQuery.isError && filtered.length === 0 && (
        <Card className="p-12 text-center">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">
            {itemsQuery.isLoading
              ? 'Loading review items…'
              : status === 'open'
                ? 'Nothing waiting for review.'
                : `No ${status} items.`}
          </p>
        </Card>
      )}

      {filtered.length > 0 && (
        <div className="space-y-4">
          {bySource.map(([sourceId, sourceItems]) => (
            <Card key={sourceId} className="overflow-hidden">
              <div className="flex items-center justify-between border-b bg-muted px-4 py-2">
                <h3 className="text-sm font-semibold">{formatSourceName(sourceId)}</h3>
                <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium tabular-nums">
                  {sourceItems.length}
                </span>
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

      <p className="text-center text-xs text-muted-foreground">
        Read-only for now — one-click resolution (and the Learned Rules it writes) ships with the
        BUILD-BRIEF-02 review-queue backend.
      </p>
    </div>
  );
}
