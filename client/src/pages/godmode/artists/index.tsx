// Godmode › Artists — dense curation table.
// Full filtered set virtualized in one scroll (no pagination), facet chips with
// live counts, shift-click multi-select with bulk actions, row click opens the
// existing edit modal navigable across the filtered set.

import { useMemo, useState } from 'react';
import {
  CheckCircle,
  Edit,
  Facebook,
  Globe,
  Lock,
  LockOpen,
  Plus,
  Trash2,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/use-confirm';
import { useToast } from '@/hooks/use-toast';
import { useArtistTaxonomy } from '@/lib/artist-taxonomy';
import type { Artist } from '@/lib/services/godmode-service';
import DataTable, { type Column } from '../components/DataTable';
import {
  BulkActionBar,
  GodmodePageHeader,
  SourceBadge,
  TableSearch,
} from '../components/godmode-ui';
import {
  useDeleteArtist,
  useGodmodeArtists,
  useGodmodeEvents,
  useGodmodeAllEvents,
  useGodmodeMemberships,
  useGodmodeUsers,
  useMarkArtistReviewed,
  useUpdateArtist,
  useCreateArtist,
} from '../lib/queries';
import ArtistEditModal from '../components/ArtistEditModal';
import ArtistCreateModal from '../components/ArtistCreateModal';

type ArtistFacet =
  | 'all'
  | 'needs-review'
  | 'unvalidated'
  | 'validated'
  | 'no-genres'
  | 'no-socials'
  | 'no-gigs'
  | 'no-location'
  | 'frontstage'
  | 'backstage';

const hasSocials = (a: Artist) => Boolean(a.facebookUrl || a.instagramUrl);
const hasGenres = (a: Artist) => Array.isArray(a.genres) && a.genres.length > 0;
const hasGigs = (a: Artist, counts: Record<string, number>) => (counts[a.id] ?? 0) > 0;

export default function ArtistsPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const { toast } = useToast();
  const { data: taxonomy } = useArtistTaxonomy();

  const artistsQuery = useGodmodeArtists();
  const eventsQuery = useGodmodeEvents();
  const allEventsQuery = useGodmodeAllEvents();
  const usersQuery = useGodmodeUsers();
  const membershipsQuery = useGodmodeMemberships();

  const updateArtist = useUpdateArtist();
  const createArtist = useCreateArtist();
  const deleteArtist = useDeleteArtist();
  const markReviewed = useMarkArtistReviewed();

  const artists = artistsQuery.data ?? [];

  // Filters - facets is a Set for multi-select (AND logic)
  const [activeFacets, setActiveFacets] = useState<Set<ArtistFacet>>(new Set());
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [acousticFilter, setAcousticFilter] = useState('all');
  const [actTypeFilter, setActTypeFilter] = useState('');

  const toggleFacet = (f: ArtistFacet) => {
    setActiveFacets((prev) => {
      const next = new Set(prev);
      if (next.has(f)) {
        next.delete(f);
      } else {
        next.add(f);
      }
      return next;
    });
    setSelected(new Set());
  };

  // Selection + modals
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Derived lookups
  const futureEventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const event of eventsQuery.data ?? []) {
      if (event.artistId) counts[event.artistId] = (counts[event.artistId] || 0) + 1;
    }
    return counts;
  }, [eventsQuery.data]);

  // Past events = all events minus future events (for showing "0 (3)" in gig column)
  const pastEventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const today = new Date().toISOString().split('T')[0];
    for (const event of allEventsQuery.data ?? []) {
      if (event.artistId && event.date < today) {
        counts[event.artistId] = (counts[event.artistId] || 0) + 1;
      }
    }
    return counts;
  }, [allEventsQuery.data]);

  const ownerByArtist = useMemo(() => {
    const users = usersQuery.data ?? [];
    const byCognito = new Map(users.map((u) => [u.cognitoId, u]));
    const owners: Record<string, string> = {};
    for (const m of membershipsQuery.data ?? []) {
      if (m.role === 'owner') {
        const user = byCognito.get(m.user_id);
        owners[m.artist_id] = user ? user.displayName || user.username : '(user not found)';
      }
    }
    return owners;
  }, [usersQuery.data, membershipsQuery.data]);

  const matchesFacet = (a: Artist, f: ArtistFacet): boolean => {
    switch (f) {
      case 'needs-review': return a.needs_review === true;
      case 'validated': return a.validated === true;
      case 'unvalidated': return a.validated !== true;
      case 'no-genres': return !hasGenres(a);
      case 'no-socials': return !hasSocials(a);
      case 'no-gigs': return !hasGigs(a, futureEventCounts);
      case 'no-location': return !a.location;
      case 'frontstage': return a.source === 'frontstage';
      case 'backstage': return a.source === 'backstage';
      default: return true;
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const selectedType = typeFilter ? taxonomy.artistTypes.find((type) => type.value === typeFilter) : undefined;
    const typeAliases = selectedType ? new Set([selectedType.value.toLowerCase(), selectedType.label.toLowerCase()]) : null;
    return artists.filter((a) => {
      if (q) {
        const hit =
          (a.name && String(a.name).toLowerCase().includes(q)) ||
          (a.location && String(a.location).toLowerCase().includes(q));
        if (!hit) return false;
      }
      // Apply ALL active facets (AND logic)
      for (const f of activeFacets) {
        if (!matchesFacet(a, f)) return false;
      }
      // Compatibility while old records are being normalised: both `band` and
      // the historical `Band` representation match the same filter choice.
      if (typeAliases && (!a.artistType || !typeAliases.has(String(a.artistType).toLowerCase()))) return false;
      if (acousticFilter === 'acoustic' && a.acoustic !== true) return false;
      if (acousticFilter === 'non-acoustic' && a.acoustic === true) return false;
      if (actTypeFilter && (!a.actType || !a.actType.some((value) => String(value).toLowerCase() === actTypeFilter))) return false;
      return true;
    });
  }, [artists, search, activeFacets, typeFilter, acousticFilter, actTypeFilter, futureEventCounts, taxonomy.artistTypes]);

  const facets = useMemo(
    () => [
      { value: 'needs-review', label: 'Needs review', count: artists.filter((a) => a.needs_review === true).length, warn: true },
      { value: 'unvalidated', label: 'Unvalidated', count: artists.filter((a) => a.validated !== true).length },
      { value: 'validated', label: 'Validated', count: artists.filter((a) => a.validated === true).length },
      { value: 'no-genres', label: 'No genres', count: artists.filter((a) => !hasGenres(a)).length, warn: true },
      { value: 'no-socials', label: 'No socials', count: artists.filter((a) => !hasSocials(a)).length, warn: true },
      { value: 'no-gigs', label: 'No gigs', count: artists.filter((a) => !hasGigs(a, futureEventCounts)).length, warn: true },
      { value: 'no-location', label: 'No location', count: artists.filter((a) => !a.location).length, warn: true },
      { value: 'frontstage', label: 'Frontstage', count: artists.filter((a) => a.source === 'frontstage').length },
      { value: 'backstage', label: 'Backstage', count: artists.filter((a) => a.source === 'backstage').length },
    ],
    [artists, futureEventCounts],
  );

  // ===== Row + bulk actions =====

  const handleDelete = async (artistId: string) => {
    const artist = artists.find((a) => a.id === artistId);
    const confirmed = await confirm({
      title: 'Delete Artist',
      description: `Delete "${artist?.name ?? 'this artist'}"? This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      await deleteArtist.mutateAsync({ id: artistId });
      toast({ title: 'Artist deleted' });
    } catch (err: any) {
      if (err.status === 409 && err.body?.requiresConfirmation) {
        const eventCount = err.body.eventCount || 0;
        const force = await confirm({
          title: 'Artist Has Events',
          description: `This artist has ${eventCount} event(s). Delete the artist AND all ${eventCount} event(s)?`,
          confirmText: `Delete All (${eventCount + 1} items)`,
          variant: 'destructive',
        });
        if (force) {
          await deleteArtist.mutateAsync({ id: artistId, force: true });
          toast({ title: 'Artist and events deleted', description: `Removed ${eventCount} associated event(s).` });
        }
      } else {
        toast({ title: 'Delete failed', description: err?.message ?? 'Unknown error', variant: 'destructive' });
      }
    }
  };

  const selectedArtists = filtered.filter((a) => selected.has(a.id));
  const selectedNeedingReview = selectedArtists.filter((a) => a.needs_review === true);

  const bulkMarkReviewed = async () => {
    let done = 0;
    for (const artist of selectedNeedingReview) {
      try {
        await markReviewed.mutateAsync(artist.id);
        done++;
      } catch {
        // keep going; report at the end
      }
    }
    toast({ title: `Marked ${done} artist(s) as reviewed` });
    setSelected(new Set());
  };

  const bulkDelete = async () => {
    const confirmed = await confirm({
      title: `Delete ${selectedArtists.length} artists`,
      description:
        'Artists with events will be SKIPPED (delete those individually so the cascade is a deliberate choice). This cannot be undone.',
      confirmText: `Delete ${selectedArtists.length}`,
      variant: 'destructive',
    });
    if (!confirmed) return;

    let deleted = 0;
    let skipped = 0;
    for (const artist of selectedArtists) {
      try {
        await deleteArtist.mutateAsync({ id: artist.id });
        deleted++;
      } catch (err: any) {
        skipped++;
        void err;
      }
    }
    toast({
      title: `Deleted ${deleted} artist(s)`,
      description: skipped > 0 ? `${skipped} skipped (has events or delete failed).` : undefined,
    });
    setSelected(new Set());
  };

  const toggleBackstage = async (artist: Artist) => {
    const newSource = artist.source === 'backstage' ? 'community' : 'backstage';
    const confirmed = await confirm({
      title: `${newSource === 'backstage' ? 'Enable' : 'Disable'} Backstage Access`,
      description:
        newSource === 'backstage'
          ? `Enable Backstage for "${artist.name}"? Owners will be able to manage their profile and create gigs.`
          : `Revert "${artist.name}" to Community? This removes Backstage access.`,
      confirmText: newSource === 'backstage' ? 'Enable Backstage' : 'Revert to Community',
    });
    if (!confirmed) return;
    try {
      await updateArtist.mutateAsync({ id: artist.id, data: { source: newSource } });
      toast({ title: newSource === 'backstage' ? 'Backstage enabled' : 'Reverted to community' });
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  // ===== Columns =====

  const columns: Column<Artist>[] = [
    {
      key: 'name',
      header: 'Name',
      sortValue: (a) => a.name,
      render: (a) => (
        <span className="flex items-center gap-1.5 font-medium">
          {a.needs_review && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" title="Needs review" />}
          <span className="truncate">{a.name}</span>
          {a.isVerified && <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-500" aria-label="Verified" />}
        </span>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      sortValue: (a) => a.location,
      render: (a) => a.location || <span className="text-orange-500">—</span>,
    },
    {
      key: 'genres',
      header: 'Genres',
      className: 'hidden lg:table-cell',
      sortValue: (a) => (hasGenres(a) ? a.genres.length : 0),
      render: (a) =>
        hasGenres(a) ? (
          <span className="text-muted-foreground">
            {a.genres.slice(0, 2).join(', ')}
            {a.genres.length > 2 && ` +${a.genres.length - 2}`}
          </span>
        ) : (
          <span className="text-orange-500">—</span>
        ),
    },
    {
      key: 'events',
      header: 'Gigs',
      align: 'right',
      widthClass: 'w-20',
      sortValue: (a) => futureEventCounts[a.id] || 0,
      render: (a) => {
        const future = futureEventCounts[a.id] || 0;
        const past = pastEventCounts[a.id] || 0;
        if (future === 0 && past === 0) {
          return <span className="text-muted-foreground">0</span>;
        }
        if (past === 0) {
          return future;
        }
        return (
          <span>
            {future > 0 ? future : <span className="text-muted-foreground">0</span>}
            <span className="text-muted-foreground text-xs ml-0.5">({past})</span>
          </span>
        );
      },
    },
    {
      key: 'links',
      header: 'Links',
      widthClass: 'w-20',
      render: (a) => (
        <span className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {a.websiteUrl && (
            <a href={a.websiteUrl} target="_blank" rel="noopener noreferrer" title={a.websiteUrl}>
              <Globe className="h-3.5 w-3.5 text-blue-500 hover:text-blue-400" />
            </a>
          )}
          {a.facebookUrl && (
            <a href={a.facebookUrl} target="_blank" rel="noopener noreferrer" title="Facebook">
              <Facebook className="h-3.5 w-3.5 text-blue-500 hover:text-blue-400" />
            </a>
          )}
          {!a.websiteUrl && !a.facebookUrl && <span className="text-orange-500">—</span>}
        </span>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      className: 'hidden xl:table-cell',
      sortValue: (a) => ownerByArtist[a.id],
      render: (a) =>
        ownerByArtist[a.id] ? (
          <span className="text-muted-foreground">{ownerByArtist[a.id]}</span>
        ) : (
          <span className="text-muted-foreground/50 italic">unclaimed</span>
        ),
    },
    {
      key: 'source',
      header: 'Source',
      widthClass: 'w-24',
      sortValue: (a) => a.source ?? '',
      render: (a) => <SourceBadge source={a.source} />,
    },
    {
      key: 'created',
      header: 'Created',
      widthClass: 'w-28',
      className: 'hidden xl:table-cell',
      sortValue: (a) => a.createdAt,
      render: (a) => (
        <span className="text-muted-foreground text-xs">
          {a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-GB') : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      widthClass: 'w-28',
      render: (a) => (
        <span className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {a.needs_review && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              title="Mark as reviewed"
              onClick={() =>
                markReviewed
                  .mutateAsync(a.id)
                  .then(() => toast({ title: 'Marked as reviewed' }))
                  .catch((err: unknown) =>
                    toast({
                      title: 'Failed to mark reviewed',
                      description: err instanceof Error ? err.message : 'Unknown error',
                      variant: 'destructive',
                    }),
                  )
              }
            >
              <CheckCircle className="h-3.5 w-3.5" />
            </Button>
          )}
          {(a.source === 'community' || a.source === 'backstage') && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              title={a.source === 'backstage' ? 'Disable Backstage access' : 'Enable in Backstage'}
              onClick={() => toggleBackstage(a)}
            >
              {a.source === 'backstage' ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            title="Edit"
            onClick={() => setEditIndex(filtered.findIndex((x) => x.id === a.id))}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            title="Delete"
            onClick={() => handleDelete(a.id)}
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
        icon={User}
        title="Artists"
        count={`${filtered.length.toLocaleString()} of ${artists.length.toLocaleString()}`}
        isFetching={artistsQuery.isFetching}
        onRefresh={() => artistsQuery.refetch()}
      >
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New artist
        </Button>
      </GodmodePageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <TableSearch
          value={search}
          onChange={(v) => { setSearch(v); setSelected(new Set()); }}
          placeholder="Search name or location…"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-8 rounded-md border bg-background px-2 text-sm"
        >
          <option value="">Any type</option>
          {taxonomy.artistTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
        </select>
        <select
          value={acousticFilter}
          onChange={(e) => setAcousticFilter(e.target.value)}
          className="h-8 rounded-md border bg-background px-2 text-sm"
        >
          <option value="all">Acoustic + full</option>
          <option value="acoustic">Acoustic only</option>
          <option value="non-acoustic">Non-acoustic</option>
        </select>
        <select
          value={actTypeFilter}
          onChange={(e) => setActTypeFilter(e.target.value)}
          className="h-8 rounded-md border bg-background px-2 text-sm"
        >
          <option value="">Any act type</option>
          {taxonomy.actTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
        </select>
      </div>

      {/* Multi-select facet chips (AND logic) */}
      <div className="flex gap-1.5 flex-wrap">
        {activeFacets.size > 0 && (
          <button
            type="button"
            onClick={() => { setActiveFacets(new Set()); setSelected(new Set()); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Clear filters
          </button>
        )}
        {facets.map((facet) => {
          const isActive = activeFacets.has(facet.value as ArtistFacet);
          return (
            <button
              key={facet.value}
              type="button"
              onClick={() => toggleFacet(facet.value as ArtistFacet)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {facet.label}
              {facet.count !== undefined && (
                <span className={`tabular-nums ${!isActive && facet.warn && facet.count > 0 ? 'text-orange-500 font-semibold' : 'opacity-70'}`}>
                  {facet.count.toLocaleString()}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {artistsQuery.isError ? (
        <div className="py-12 text-center text-destructive">{(artistsQuery.error as Error).message}</div>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(a) => a.id}
          selected={selected}
          onSelectedChange={setSelected}
          onRowClick={(a) => setEditIndex(filtered.findIndex((x) => x.id === a.id))}
          defaultSort={{ key: 'name', dir: 'asc' }}
          emptyMessage={artistsQuery.isLoading ? 'Loading artists…' : 'No artists match the current filters.'}
        />
      )}

      <BulkActionBar count={selectedArtists.length} onClear={() => setSelected(new Set())}>
        {selectedNeedingReview.length > 0 && (
          <Button size="sm" variant="secondary" onClick={bulkMarkReviewed}>
            <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
            Mark reviewed ({selectedNeedingReview.length})
          </Button>
        )}
        <Button size="sm" variant="destructive" onClick={bulkDelete}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
      </BulkActionBar>

      <ConfirmDialog />

      {editIndex !== null && filtered.length > 0 && (
        <ArtistEditModal
          open={editIndex !== null}
          onClose={() => setEditIndex(null)}
          artists={filtered}
          currentIndex={Math.min(editIndex, filtered.length - 1)}
          onSave={async (artist) => {
            await updateArtist.mutateAsync({ id: artist.id, data: artist });
          }}
          onNavigate={setEditIndex}
          onDelete={handleDelete}
        />
      )}

      <ArtistCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (artistData) => {
          await createArtist.mutateAsync(artistData);
        }}
      />
    </div>
  );
}
