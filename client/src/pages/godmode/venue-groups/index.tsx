// Godmode › Venue groups — feature 19.
//
// OWNERSHIP IS NOT SCOPE. A venue has exactly ONE owner group: it is a fact
// about the venue. A venue belongs to MANY scopes (an edition, a festival
// trail, a partner site) and that is feature 16, Editions, which resolves a
// venue set from postcode areas, a polygon, an owner group and an explicit
// list. This page only does ownership.
//
// ASSIGNMENT LIVES ON THE VENUES PAGE, NOT HERE. That table already has search,
// facets and bulk select. Rebuilding a second searchable venue table here would
// be the worse half of the same screen. Assigning 235 Robinsons pubs is:
// Venues, search, select all, "Set owner group".

import { useMemo, useState } from 'react';
import { Building2, Edit, ExternalLink, Plus } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { VenueGroup, VenueGroupType } from '@/lib/services/godmode-service';
import DataTable, { type Column } from '../components/DataTable';
import { GodmodePageHeader, TableSearch } from '../components/godmode-ui';
import { useCreateVenueGroup, useUpdateVenueGroup, useVenueGroups } from '../lib/queries';

const GROUP_TYPES: { value: VenueGroupType; label: string; help: string }[] = [
  { value: 'brewery', label: 'Brewery', help: 'Brews beer and owns pubs. Robinsons.' },
  { value: 'pubco', label: 'Pub company', help: 'Owns pubs, brews nothing. Amber Taverns.' },
  { value: 'chain', label: 'Chain', help: 'One brand across many sites. Wetherspoons.' },
  { value: 'operator', label: 'Operator', help: 'Runs sites it does not own.' },
];

const TYPE_LABEL: Record<string, string> = Object.fromEntries(GROUP_TYPES.map((t) => [t.value, t.label]));

interface DraftGroup {
  id?: string;
  name: string;
  groupType: VenueGroupType;
  website: string;
  facebookUrl: string;
  bio: string;
}

const EMPTY: DraftGroup = { name: '', groupType: 'brewery', website: '', facebookUrl: '', bio: '' };

export default function VenueGroupsPage() {
  const { toast } = useToast();
  const groupsQuery = useVenueGroups();
  const createGroup = useCreateVenueGroup();
  const updateGroup = useUpdateVenueGroup();

  const groups = groupsQuery.data ?? [];
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<DraftGroup | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q) || g.slug.includes(q));
  }, [groups, search]);

  const save = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      toast({ title: 'A group needs a name', variant: 'destructive' });
      return;
    }
    const payload = {
      name,
      groupType: draft.groupType,
      website: draft.website.trim() || undefined,
      facebookUrl: draft.facebookUrl.trim() || undefined,
      bio: draft.bio.trim() || undefined,
    };
    try {
      if (draft.id) {
        await updateGroup.mutateAsync({ id: draft.id, data: payload });
        toast({ title: `${name} saved` });
      } else {
        await createGroup.mutateAsync(payload);
        toast({ title: `${name} created` });
      }
      setDraft(null);
    } catch (err) {
      const body = (err as { body?: { code?: string; error?: string } }).body;
      toast({
        title: body?.code === 'DUPLICATE_GROUP' ? 'That group already exists' : 'Save failed',
        // Two Robinsons records would split the estate and neither would look wrong.
        description: body?.error ?? (err instanceof Error ? err.message : 'Unknown error'),
        variant: 'destructive',
      });
    }
  };

  const columns: Column<VenueGroup>[] = [
    {
      key: 'name',
      header: 'Group',
      sortValue: (g) => g.name,
      render: (g) => (
        <span className="flex items-center gap-2 font-medium">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{g.name}</span>
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      widthClass: 'w-32',
      sortValue: (g) => g.groupType,
      render: (g) => <span className="text-muted-foreground">{TYPE_LABEL[g.groupType] ?? g.groupType}</span>,
    },
    {
      key: 'venues',
      header: 'Venues',
      align: 'right',
      widthClass: 'w-24',
      sortValue: (g) => g.venueCount ?? 0,
      render: (g) =>
        g.venueCount ? (
          // The count is a convenience, never the source of truth. The estate
          // itself comes from the ownerGroupId index.
          <Link href={`/godmode/venues?ownerGroup=${g.id}`} className="text-primary hover:underline">
            {g.venueCount}
          </Link>
        ) : (
          <span className="text-muted-foreground">0</span>
        ),
    },
    {
      key: 'links',
      header: 'Links',
      widthClass: 'w-20',
      render: (g) => (
        <span className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {g.website ? (
            <a href={g.website} target="_blank" rel="noopener noreferrer" title={g.website}>
              <ExternalLink className="h-3.5 w-3.5 text-blue-500 hover:text-blue-400" />
            </a>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      widthClass: 'w-12',
      render: (g) => (
        <span className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            title="Edit"
            onClick={() =>
              setDraft({
                id: g.id,
                name: g.name,
                groupType: g.groupType,
                website: g.website ?? '',
                facebookUrl: g.facebookUrl ?? '',
                bio: g.bio ?? '',
              })
            }
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <GodmodePageHeader
        icon={Building2}
        title="Venue groups"
        count={`${filtered.length.toLocaleString()} of ${groups.length.toLocaleString()}`}
        isFetching={groupsQuery.isFetching}
        onRefresh={() => groupsQuery.refetch()}
      >
        <Button size="sm" onClick={() => setDraft({ ...EMPTY })}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add group
        </Button>
      </GodmodePageHeader>

      <p className="text-sm text-muted-foreground">
        Who owns a venue. One group per venue. To assign venues, go to{' '}
        <Link href="/godmode/venues" className="text-primary hover:underline">
          Venues
        </Link>
        , search, select, then use Set owner group. Nothing here is public yet.
      </p>

      <TableSearch value={search} onChange={setSearch} placeholder="Search group name…" />

      {groupsQuery.isError ? (
        <div className="py-12 text-center text-destructive">{(groupsQuery.error as Error).message}</div>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(g) => g.id}
          defaultSort={{ key: 'name', dir: 'asc' }}
          emptyMessage={groupsQuery.isLoading ? 'Loading groups…' : 'No groups yet. Add one to get started.'}
        />
      )}

      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg space-y-4 rounded-lg border bg-card p-5 shadow-lg">
            <h2 className="text-lg font-semibold">{draft.id ? 'Edit group' : 'New group'}</h2>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Name</label>
              <Input
                autoFocus
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Robinsons Brewery"
              />
              {draft.id && (
                <p className="text-xs text-muted-foreground">
                  A rename updates every venue in the estate. That can take a moment.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type</label>
              <div className="grid grid-cols-2 gap-2">
                {GROUP_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setDraft({ ...draft, groupType: t.value })}
                    className={
                      'rounded-md border px-3 py-2 text-left text-sm transition-colors ' +
                      (draft.groupType === t.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted')
                    }
                  >
                    <span className="block font-medium">{t.label}</span>
                    <span className="block text-xs text-muted-foreground">{t.help}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Website</label>
              <Input
                value={draft.website}
                onChange={(e) => setDraft({ ...draft, website: e.target.value })}
                placeholder="https://www.robinsonsbrewery.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Facebook</label>
              <Input
                value={draft.facebookUrl}
                onChange={(e) => setDraft({ ...draft, facebookUrl: e.target.value })}
                placeholder="https://www.facebook.com/..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={createGroup.isPending || updateGroup.isPending}>
                {draft.id ? 'Save' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
