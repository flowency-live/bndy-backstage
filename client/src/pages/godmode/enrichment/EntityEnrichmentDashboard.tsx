// Godmode > Enrichment - Review AI-enriched artist/venue profiles before applying.
// Phase 1: Entity queue for artists + venues with pending enrichment_data.

import { useState, useMemo } from 'react';
import { Check, MapPin, Sparkles, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import DataTable, { type Column } from '../components/DataTable';
import { FacetChips, GodmodePageHeader, TableSearch, type Facet } from '../components/godmode-ui';
import {
  useEnrichmentQueue,
  useAcceptEnrichment,
  useRejectEnrichment,
  type EnrichmentQueueItem,
} from '../lib/queries';
import ConfidenceBadge from './components/ConfidenceBadge';
import EnrichmentDetail from './components/EnrichmentDetail';

type QueueFacet = 'all' | 'high' | 'medium' | 'low' | 'artist' | 'venue';

function getConfidence(item: EnrichmentQueueItem): string | undefined {
  if (item.type === 'artist') {
    return item.enrichmentData?.confidence;
  }
  return item.enrichment_data?.confidence;
}

function getEnrichmentDate(item: EnrichmentQueueItem): string | undefined {
  if (item.type === 'artist') {
    return item.enrichmentDate ?? undefined;
  }
  return item.enrichment_date ?? undefined;
}

function getSuggestedFields(item: EnrichmentQueueItem): string[] {
  const data = item.type === 'artist' ? item.enrichmentData : item.enrichment_data;
  if (!data) return [];
  return Object.keys(data)
    .filter((k) => k.startsWith('suggested_'))
    .map((k) => k.replace('suggested_', ''));
}

export default function EnrichmentDashboard() {
  const { toast } = useToast();
  const { data: queue, isLoading } = useEnrichmentQueue();
  const acceptMutation = useAcceptEnrichment();
  const rejectMutation = useRejectEnrichment();

  const [facet, setFacet] = useState<QueueFacet>('all');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<EnrichmentQueueItem | null>(null);

  // Facet counts
  const facets: Facet[] = useMemo(() => {
    const items = queue ?? [];
    const high = items.filter((i) => getConfidence(i) === 'HIGH').length;
    const medium = items.filter((i) => getConfidence(i) === 'MEDIUM').length;
    const low = items.filter((i) => getConfidence(i) === 'LOW').length;
    const artistCount = items.filter((i) => i.type === 'artist').length;
    const venueCount = items.filter((i) => i.type === 'venue').length;

    return [
      { value: 'all', label: 'All', count: items.length },
      { value: 'high', label: 'High confidence', count: high },
      { value: 'medium', label: 'Medium', count: medium, warn: medium > 0 },
      { value: 'low', label: 'Low', count: low, warn: low > 0 },
      { value: 'artist', label: 'Artists', count: artistCount },
      { value: 'venue', label: 'Venues', count: venueCount },
    ];
  }, [queue]);

  // Filter items
  const filtered = useMemo(() => {
    let items = queue ?? [];

    // Facet filter
    if (facet === 'high') items = items.filter((i) => getConfidence(i) === 'HIGH');
    else if (facet === 'medium') items = items.filter((i) => getConfidence(i) === 'MEDIUM');
    else if (facet === 'low') items = items.filter((i) => getConfidence(i) === 'LOW');
    else if (facet === 'artist') items = items.filter((i) => i.type === 'artist');
    else if (facet === 'venue') items = items.filter((i) => i.type === 'venue');

    // Search filter
    if (search) {
      const lc = search.toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(lc));
    }

    return items;
  }, [queue, facet, search]);

  // Actions
  const handleAccept = async (item: EnrichmentQueueItem, fields?: string[]) => {
    try {
      await acceptMutation.mutateAsync({ type: item.type, id: item.id, fields });
      toast({ title: 'Enrichment accepted', description: `Applied changes to ${item.name}` });
      setSelectedItem(null);
    } catch {
      toast({ title: 'Error', description: 'Failed to accept enrichment', variant: 'destructive' });
    }
  };

  const handleReject = async (item: EnrichmentQueueItem) => {
    try {
      await rejectMutation.mutateAsync({ type: item.type, id: item.id });
      toast({ title: 'Enrichment rejected', description: `Discarded suggestions for ${item.name}` });
      setSelectedItem(null);
    } catch {
      toast({ title: 'Error', description: 'Failed to reject enrichment', variant: 'destructive' });
    }
  };

  const columns: Column<EnrichmentQueueItem>[] = [
    {
      key: 'type',
      header: 'Type',
      widthClass: 'w-20',
      render: (item) =>
        item.type === 'artist' ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3.5 w-3.5" /> Artist
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> Venue
          </span>
        ),
    },
    {
      key: 'name',
      header: 'Name',
      sortValue: (item) => item.name,
      render: (item) => <span className="font-medium">{item.name}</span>,
    },
    {
      key: 'location',
      header: 'Location',
      className: 'hidden lg:table-cell',
      render: (item) =>
        item.type === 'artist' ? item.location || '—' : (item as any).address || '—',
    },
    {
      key: 'confidence',
      header: 'Confidence',
      widthClass: 'w-28',
      sortValue: (item) => {
        const conf = getConfidence(item);
        return conf === 'HIGH' ? 3 : conf === 'MEDIUM' ? 2 : 1;
      },
      render: (item) => {
        const conf = getConfidence(item);
        return conf ? <ConfidenceBadge confidence={conf as 'HIGH' | 'MEDIUM' | 'LOW'} /> : '—';
      },
    },
    {
      key: 'suggested',
      header: 'Suggested',
      className: 'hidden md:table-cell',
      render: (item) => {
        const fields = getSuggestedFields(item);
        return (
          <span className="text-xs text-muted-foreground">
            {fields.length > 0 ? fields.join(', ') : '—'}
          </span>
        );
      },
    },
    {
      key: 'date',
      header: 'Date',
      widthClass: 'w-24',
      sortValue: (item) => getEnrichmentDate(item) ?? '',
      render: (item) => {
        const date = getEnrichmentDate(item);
        if (!date) return '—';
        return (
          <span className="text-xs text-muted-foreground tabular-nums">
            {new Date(date).toLocaleDateString('en-GB')}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      widthClass: 'w-32',
      render: (item) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={(e) => {
              e.stopPropagation();
              handleAccept(item);
            }}
            disabled={acceptMutation.isPending}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Accept
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              handleReject(item);
            }}
            disabled={rejectMutation.isPending}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <GodmodePageHeader
        icon={Sparkles}
        title="Enrichment"
        count={`${filtered.length} of ${queue?.length ?? 0} pending`}
      />

      <Tabs defaultValue="entities" className="space-y-4">
        <TabsList>
          <TabsTrigger value="entities">
            Entities ({queue?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="events" disabled>
            Events (Phase 2)
          </TabsTrigger>
          <TabsTrigger value="metrics" disabled>
            Metrics (Phase 2)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entities" className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <FacetChips facets={facets} active={facet} onChange={(v) => setFacet(v as QueueFacet)} />
            <TableSearch value={search} onChange={setSearch} placeholder="Search by name..." />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr,400px] gap-4">
            <DataTable
              columns={columns}
              rows={filtered}
              rowKey={(item) => item.id}
              onRowClick={(item) => setSelectedItem(item.id === selectedItem?.id ? null : item)}
              emptyMessage="No pending enrichments"
              heightClass={selectedItem ? 'h-[400px]' : 'h-[calc(100vh-340px)]'}
            />

            {selectedItem && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-3 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedItem.type === 'artist' ? (
                      <User className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{selectedItem.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setSelectedItem(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <EnrichmentDetail
                  item={selectedItem}
                  onAccept={(fields) => handleAccept(selectedItem, fields)}
                  onReject={() => handleReject(selectedItem)}
                  isAccepting={acceptMutation.isPending}
                  isRejecting={rejectMutation.isPending}
                />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
