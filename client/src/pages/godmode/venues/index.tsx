// Godmode › Venues — dense curation table on the shared DataTable.

import { useMemo, useState } from 'react';
import { Edit, Facebook, Globe, MapPin, Plus, Ticket, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/use-confirm';
import { useToast } from '@/hooks/use-toast';
import type { Venue } from '@/lib/services/godmode-service';
import DataTable, { type Column } from '../components/DataTable';
import {
  BoolMark,
  BulkActionBar,
  FacetChips,
  GodmodePageHeader,
  TableSearch,
  useInitialUrlFilter,
} from '../components/godmode-ui';
import {
  useCreateVenue,
  useDeleteVenue,
  useGodmodeVenues,
  useUpdateVenue,
} from '../lib/queries';
import VenueEditModal from '../components/VenueEditModal';
import VenueAddModal from '../components/VenueAddModal';

const venueHasSocials = (v: Venue): boolean =>
  Boolean(
    v.website ||
      (Array.isArray(v.socialMediaUrls) &&
        v.socialMediaUrls.some((item) => {
          const url = typeof item === 'string' ? item : item?.url;
          return Boolean(url);
        })),
  );

export default function VenuesPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const { toast } = useToast();

  const venuesQuery = useGodmodeVenues();
  const updateVenue = useUpdateVenue();
  const createVenue = useCreateVenue();
  const deleteVenue = useDeleteVenue();

  const venues = venuesQuery.data ?? [];

  const [facet, setFacet] = useInitialUrlFilter('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return venues.filter((v) => {
      if (q) {
        const hit =
          (v.name && String(v.name).toLowerCase().includes(q)) ||
          (v.address && String(v.address).toLowerCase().includes(q)) ||
          (v.postcode && String(v.postcode).toLowerCase().includes(q));
        if (!hit) return false;
      }
      switch (facet) {
        case 'validated': return v.validated === true;
        case 'unvalidated': return v.validated !== true;
        case 'no-place-id': return !v.googlePlaceId;
        case 'no-socials': return !venueHasSocials(v);
        case 'no-gigs': return !v.eventCount || v.eventCount === 0;
        case 'ticketed': return v.isTicketed === true || v.standardTicketed === true;
        default: return true;
      }
    });
  }, [venues, search, facet]);

  const facets = useMemo(
    () => [
      { value: 'all', label: 'All', count: venues.length },
      { value: 'unvalidated', label: 'Unvalidated', count: venues.filter((v) => v.validated !== true).length },
      { value: 'validated', label: 'Validated', count: venues.filter((v) => v.validated === true).length },
      { value: 'no-place-id', label: 'No place ID', count: venues.filter((v) => !v.googlePlaceId).length, warn: true },
      { value: 'no-socials', label: 'No socials', count: venues.filter((v) => !venueHasSocials(v)).length, warn: true },
      { value: 'no-gigs', label: 'No gigs', count: venues.filter((v) => !v.eventCount || v.eventCount === 0).length },
      {
        value: 'ticketed',
        label: 'Ticketed',
        count: venues.filter((v) => v.isTicketed === true || v.standardTicketed === true).length,
      },
    ],
    [venues],
  );

  const handleDelete = async (venueId: string) => {
    const venue = venues.find((v) => v.id === venueId);
    const confirmed = await confirm({
      title: 'Delete Venue',
      description: `Delete "${venue?.name ?? 'this venue'}"? This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;
    try {
      await deleteVenue.mutateAsync(venueId);
      toast({ title: 'Venue deleted' });
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const selectedVenues = filtered.filter((v) => selected.has(v.id));

  const bulkDelete = async () => {
    const confirmed = await confirm({
      title: `Delete ${selectedVenues.length} venues`,
      description: 'This cannot be undone. Venues that fail to delete (e.g. still referenced) are skipped.',
      confirmText: `Delete ${selectedVenues.length}`,
      variant: 'destructive',
    });
    if (!confirmed) return;
    let deleted = 0;
    let skipped = 0;
    for (const venue of selectedVenues) {
      try {
        await deleteVenue.mutateAsync(venue.id);
        deleted++;
      } catch {
        skipped++;
      }
    }
    toast({
      title: `Deleted ${deleted} venue(s)`,
      description: skipped > 0 ? `${skipped} skipped (delete failed).` : undefined,
    });
    setSelected(new Set());
  };

  const columns: Column<Venue>[] = [
    {
      key: 'name',
      header: 'Name',
      sortValue: (v) => v.name,
      render: (v) => (
        <span className="flex items-center gap-1.5 font-medium">
          <span className="truncate">{v.name}</span>
          {(v.isTicketed === true || v.standardTicketed === true) && (
            <Ticket className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Ticketed venue" />
          )}
        </span>
      ),
    },
    {
      key: 'address',
      header: 'Address',
      sortValue: (v) => v.address,
      render: (v) => <span className="text-muted-foreground">{v.address || '—'}</span>,
    },
    {
      key: 'postcode',
      header: 'Postcode',
      widthClass: 'w-24',
      className: 'hidden lg:table-cell',
      sortValue: (v) => v.postcode,
      render: (v) => v.postcode || <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'placeId',
      header: 'Place ID',
      widthClass: 'w-20',
      sortValue: (v) => (v.googlePlaceId ? 1 : 0),
      render: (v) => <BoolMark value={Boolean(v.googlePlaceId)} warnWhenMissing />,
    },
    {
      key: 'socials',
      header: 'Socials',
      widthClass: 'w-20',
      sortValue: (v) => (venueHasSocials(v) ? 1 : 0),
      render: (v) => (
        <span className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {v.website && (
            <a href={v.website} target="_blank" rel="noopener noreferrer" title={v.website}>
              <Globe className="h-3.5 w-3.5 text-blue-500 hover:text-blue-400" />
            </a>
          )}
          {Array.isArray(v.socialMediaUrls) &&
            (() => {
              const fb = v.socialMediaUrls
                .map((item) => (typeof item === 'string' ? item : item?.url))
                .find((url) => url && url.includes('facebook.com'));
              return fb ? (
                <a href={fb} target="_blank" rel="noopener noreferrer" title="Facebook">
                  <Facebook className="h-3.5 w-3.5 text-blue-500 hover:text-blue-400" />
                </a>
              ) : null;
            })()}
          {!venueHasSocials(v) && <span className="text-orange-500">—</span>}
        </span>
      ),
    },
    {
      key: 'events',
      header: 'Events',
      align: 'right',
      widthClass: 'w-20',
      className: 'hidden xl:table-cell',
      sortValue: (v) => v.eventCount ?? 0,
      render: (v) =>
        v.eventCount !== undefined ? v.eventCount : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'validated',
      header: 'Valid',
      widthClass: 'w-16',
      sortValue: (v) => (v.validated ? 1 : 0),
      render: (v) => <BoolMark value={v.validated === true} />,
    },
    {
      key: 'actions',
      header: '',
      widthClass: 'w-20',
      render: (v) => (
        <span className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            title="Edit"
            onClick={() => setEditIndex(filtered.findIndex((x) => x.id === v.id))}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            title="Delete"
            onClick={() => handleDelete(v.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <GodmodePageHeader
        icon={MapPin}
        title="Venues"
        count={`${filtered.length.toLocaleString()} of ${venues.length.toLocaleString()}`}
        isFetching={venuesQuery.isFetching}
        onRefresh={() => venuesQuery.refetch()}
      >
        <Button onClick={() => setAddOpen(true)} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add venue
        </Button>
      </GodmodePageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <TableSearch
          value={search}
          onChange={(v) => { setSearch(v); setSelected(new Set()); }}
          placeholder="Search name, address, postcode…"
        />
        <FacetChips facets={facets} active={facet} onChange={(v) => { setFacet(v); setSelected(new Set()); }} />
      </div>

      {venuesQuery.isError ? (
        <div className="py-12 text-center text-destructive">{(venuesQuery.error as Error).message}</div>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(v) => v.id}
          selected={selected}
          onSelectedChange={setSelected}
          onRowClick={(v) => setEditIndex(filtered.findIndex((x) => x.id === v.id))}
          defaultSort={{ key: 'name', dir: 'asc' }}
          emptyMessage={venuesQuery.isLoading ? 'Loading venues…' : 'No venues match the current filters.'}
        />
      )}

      <BulkActionBar count={selectedVenues.length} onClear={() => setSelected(new Set())}>
        <Button size="sm" variant="destructive" onClick={bulkDelete}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
      </BulkActionBar>

      <ConfirmDialog />

      {editIndex !== null && filtered.length > 0 && (
        <VenueEditModal
          open={editIndex !== null}
          onClose={() => setEditIndex(null)}
          venues={filtered}
          currentIndex={Math.min(editIndex, filtered.length - 1)}
          onSave={async (venue) => {
            await updateVenue.mutateAsync({ id: venue.id, data: venue });
          }}
          onNavigate={setEditIndex}
          onDelete={handleDelete}
        />
      )}

      <VenueAddModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={async (venueData) => {
          await createVenue.mutateAsync(venueData as any);
        }}
      />
    </div>
  );
}
