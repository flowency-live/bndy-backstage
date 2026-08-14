// Godmode › Venue groups — feature 19.
//
// OWNERSHIP IS NOT SCOPE. A venue has exactly ONE owner group: it is a fact
// about the venue. A venue belongs to MANY scopes (an edition, a festival
// trail, a partner site) and that is feature 16, Editions, which resolves a
// venue set from postcode areas, a polygon, an owner group and an explicit
// list. This page only does ownership.
//
// BULK ASSIGNMENT LIVES ON THE VENUES PAGE. That table has search, facets and
// bulk select. Assigning 235 Robinsons pubs is: Venues, search, select all,
// "Set owner group". The expander here is for ONE venue at a time: check the
// estate, drop a pub that closed, add the one that was missed.
//
// NO DataTable ON THIS PAGE. DataTable is virtualised on a fixed 44px row, so a
// variable-height expanded row breaks its scroll maths. Groups number in the
// tens, not the thousands, so this page uses a plain sortable table instead of
// widening a component four other screens depend on.

import { Fragment, useMemo, useState } from 'react';
import { Building2, ChevronDown, ChevronRight, Edit, ExternalLink, Plus } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { VenueGroup, VenueGroupType } from '@/lib/services/godmode-service';
import { GodmodePageHeader, TableSearch } from '../components/godmode-ui';
import { useCreateVenueGroup, useUpdateVenueGroup, useVenueGroups } from '../lib/queries';
import GroupEstate from './GroupEstate';

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

type SortKey = 'name' | 'type' | 'venues';

const TH = 'px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground';

export default function VenueGroupsPage() {
  const { toast } = useToast();
  const groupsQuery = useVenueGroups();
  const createGroup = useCreateVenueGroup();
  const updateGroup = useUpdateVenueGroup();

  const groups = groupsQuery.data ?? [];
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<DraftGroup | null>(null);
  // One open at a time. Two open estates on screen is two lists of pub names
  // that look alike, and that is how a venue gets removed from the wrong group.
  const [openId, setOpenId] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' });

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q) || g.slug.includes(q));
  }, [groups, search]);

  const sorted = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sort.key === 'venues') return ((a.venueCount ?? 0) - (b.venueCount ?? 0)) * dir;
      const av = sort.key === 'name' ? a.name : a.groupType;
      const bv = sort.key === 'name' ? b.name : b.groupType;
      return av.localeCompare(bv, undefined, { sensitivity: 'base' }) * dir;
    });
  }, [filtered, sort]);

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
        Who owns a venue. One group per venue. Open a row to see and edit its estate. For a bulk change, go to{' '}
        <Link href="/godmode/venues" className="text-primary hover:underline">
          Venues
        </Link>
        , search, select, then use Set owner group. Nothing here is public yet.
      </p>

      <TableSearch value={search} onChange={setSearch} placeholder="Search group name…" />

      {groupsQuery.isError ? (
        <div className="py-12 text-center text-destructive">{(groupsQuery.error as Error).message}</div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="w-9" />
                <th className={TH}>
                  <button type="button" onClick={() => toggleSort('name')} className="uppercase tracking-wider">
                    Group{sort.key === 'name' ? (sort.dir === 'asc' ? ' \u2191' : ' \u2193') : ''}
                  </button>
                </th>
                <th className={cn(TH, 'w-36')}>
                  <button type="button" onClick={() => toggleSort('type')} className="uppercase tracking-wider">
                    Type{sort.key === 'type' ? (sort.dir === 'asc' ? ' \u2191' : ' \u2193') : ''}
                  </button>
                </th>
                <th className={cn(TH, 'w-24 text-right')}>
                  <button type="button" onClick={() => toggleSort('venues')} className="uppercase tracking-wider">
                    Venues{sort.key === 'venues' ? (sort.dir === 'asc' ? ' \u2191' : ' \u2193') : ''}
                  </button>
                </th>
                <th className={cn(TH, 'w-20')}>Links</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-16 text-center text-muted-foreground">
                    {groupsQuery.isLoading ? 'Loading groups…' : 'No groups yet. Add one to get started.'}
                  </td>
                </tr>
              )}
              {sorted.map((g) => {
                const open = openId === g.id;
                return (
                  <Fragment key={g.id}>
                    <tr
                      className={cn('cursor-pointer border-b transition-colors', open ? 'bg-muted/40' : 'hover:bg-muted/50')}
                      onClick={() => setOpenId(open ? null : g.id)}
                    >
                      <td className="w-9 pl-3 text-muted-foreground">
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-label={open ? `Collapse ${g.name}` : `Expand ${g.name}`}
                          className="flex h-7 w-7 items-center justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenId(open ? null : g.id);
                          }}
                        >
                          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="max-w-0 truncate px-3 py-2">
                        <span className="flex items-center gap-2 font-medium">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{g.name}</span>
                        </span>
                      </td>
                      <td className="w-36 px-3 py-2 text-muted-foreground">{TYPE_LABEL[g.groupType] ?? g.groupType}</td>
                      <td className="w-24 px-3 py-2 text-right tabular-nums">
                        {/* The count is derived from the ownerGroupId index, never a stored field. */}
                        {g.venueCount ? (
                          <Link
                            href={`/godmode/venues?ownerGroup=${g.id}`}
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {g.venueCount.toLocaleString()}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{g.venueCount === null ? 'n/a' : 0}</span>
                        )}
                      </td>
                      <td className="w-20 px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        {g.website ? (
                          <a href={g.website} target="_blank" rel="noopener noreferrer" title={g.website}>
                            <ExternalLink className="h-3.5 w-3.5 text-blue-500 hover:text-blue-400" />
                          </a>
                        ) : (
                          <span className="sr-only">No website</span>
                        )}
                      </td>
                      <td className="w-12 px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
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
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <GroupEstate group={g} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
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
