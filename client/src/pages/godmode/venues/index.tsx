// Godmode › Venues — dense curation table on the shared DataTable.

import { useMemo, useState } from 'react';
import { Building2, Edit, Facebook, Globe, MapPin, Plus, Ticket, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/use-confirm';
import { useToast } from '@/hooks/use-toast';
import type { Venue, VenueGroup } from '@/lib/services/godmode-service';
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
  useGodmodeEvents,
  useGodmodeVenues,
  useSetVenueGroup,
  useUpdateVenue,
  useVenueGroups,
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
  const groupsQuery = useVenueGroups();
  const setVenueGroup = useSetVenueGroup();
  const eventsQuery = useGodmodeEvents();
  const updateVenue = useUpdateVenue();
  const createVenue = useCreateVenue();
  const deleteVenue = useDeleteVenue();

  const venues = venuesQuery.data ?? [];

  // Build Map of venue ID -> event count
  const venueEventCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of eventsQuery.data ?? []) {
      if (event.venueId) {
        counts.set(event.venueId, (counts.get(event.venueId) ?? 0) + 1);
      }
    }
    return counts;
  }, [eventsQuery.data]);

  const [facet, setFacet] = useInitialUrlFilter('all');
  const [search, setSearch] = useState('');
  // Feature 19: the venue groups page links here with ?ownerGroup=<id>, so an
  // estate opens in the table that already has search, facets and bulk select
  // rather than in a second half-built table of its own.
  const [ownerGroup, setOwnerGroup] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('ownerGroup');
  });
  const [assignOpen, setAssignOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return venues.filter((v) => {
      if (ownerGroup && v.ownerGroupId !== ownerGroup) return false;
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
        case 'no-gigs': return !venueEventCounts.has(v.id);
        case 'no-owner': return !v.ownerGroupId;
        case 'ticketed': return v.isTicketed === true || v.standardTicketed === true;
        default: return true;
      }
    });
  }, [venues, search, facet, venueEventCounts, ownerGroup]);

  const facets = useMemo(
    () => [
      { value: 'all', label: 'All', count: venues.length },
      { value: 'unvalidated', label: 'Unvalidated', count: venues.filter((v) => v.validated !== true).length },
      { value: 'validated', label: 'Validated', count: venues.filter((v) => v.validated === true).length },
      { value: 'no-place-id', label: 'No place ID', count: venues.filter((v) => !v.googlePlaceId).length, warn: true },
      { value: 'no-socials', label: 'No socials', count: venues.filter((v) => !venueHasSocials(v)).length, warn: true },
      { value: 'no-gigs', label: 'No gigs', count: venues.filter((v) => !venueEventCounts.has(v.id)).length },
      {
        value: 'ticketed',
        label: 'Ticketed',
        count: venues.filter((v) => v.isTicketed === true || v.standardTicketed === true).length,
      },
      { value: 'no-owner', label: 'No owner group', count: venues.filter((v) => !v.ownerGroupId).length },
    ],
    [venues, venueEventCounts],
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

  /**
   * Assign every selected venue to one group, or clear it. One call per venue:
   * an estate is hundreds of rows, not thousands, and a per-row result is what
   * lets the toast say how many actually landed rather than claiming success.
   */
  const assignGroup = async (groupId: string | null) => {
    setAssignOpen(false);
    let done = 0;
    let failed = 0;
    for (const venue of selectedVenues) {
      try {
        await setVenueGroup.mutateAsync({ venueId: venue.id, ownerGroupId: groupId });
        done++;
      } catch {
        failed++;
      }
    }
    const groupName = (groupsQuery.data ?? []).find((g) => g.id === groupId)?.name;
    toast({
      title: groupId ? `${done} venue(s) set to ${groupName}` : `${done} venue(s) cleared`,
      description: failed > 0 ? `${failed} failed and were skipped.` : undefined,
      variant: failed > 0 ? 'destructive' : undefined,
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
      sortValue: (v) => venueEventCounts.get(v.id) ?? 0,
      render: (v) => {
        const count = venueEventCounts.get(v.id);
        return count ? count : <span className="text-muted-foreground">0</span>;
      },
    },
    {
      key: 'owner',
      header: 'Owner',
      widthClass: 'w-36',
      className: 'hidden lg:table-cell',
      sortValue: (v) => v.ownerGroupName ?? '',
      render: (v) =>
        v.ownerGroupName ? (
          <span className="truncate text-muted-foreground">{v.ownerGroupName}</span>
        ) : (
          // Blank, not "Independent". No owner group recorded does not mean free
          // house. It usually means nobody has checked yet.
          <span className="text-muted-foreground">—</span>
        ),
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
        {ownerGroup && (
          <Button size="sm" variant="secondary" onClick={() => { setOwnerGroup(null); setSelected(new Set()); }}>
            <Building2 className="mr-1.5 h-3.5 w-3.5" />
            {venues.find((v) => v.ownerGroupId === ownerGroup)?.ownerGroupName ?? 'Owner group'} · clear
          </Button>
        )}
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
        <Button size="sm" variant="secondary" onClick={() => setAssignOpen(true)}>
          <Building2 className="mr-1.5 h-3.5 w-3.5" />
          Set owner group
        </Button>
        <Button size="sm" variant="destructive" onClick={bulkDelete}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
      </BulkActionBar>

      {assignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-3 rounded-lg border bg-card p-5 shadow-lg">
            <h2 className="text-lg font-semibold">
              Set owner group for {selectedVenues.length} venue{selectedVenues.length === 1 ? '' : 's'}
            </h2>
            <p className="text-sm text-muted-foreground">
              A venue has one owner group. This does not change the venue name, address, postcode or place ID.
            </p>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {(groupsQuery.data ?? []).map((g: VenueGroup) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => assignGroup(g.id)}
                  className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <span className="font-medium">{g.name}</span>
                  <span className="text-xs text-muted-foreground">{g.venueCount ?? 0} venues</span>
                </button>
              ))}
              {(groupsQuery.data ?? []).length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No groups yet. Create one on the Venue groups page first.
                </p>
              )}
            </div>
            <div className="flex justify-between gap-2 pt-1">
              <Button variant="ghost" onClick={() => assignGroup(null)}>
                Clear owner group
              </Button>
              <Button variant="ghost" onClick={() => setAssignOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

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
