// The expanded panel under a group row: its estate, plus add and remove.
//
// IDENTITY IS NOT EDITABLE HERE. Nothing on this panel writes a venue name,
// address, postcode, city, place ID or coordinate. It writes ownerGroupId and
// tenure through PUT /api/venues/{id}/group, which is the only route that can
// touch those two fields. Jason ruling 2026-08-11.
//
// ADD MOVES, IT DOES NOT COPY. A venue has exactly ONE owner group. If the
// venue you pick already belongs to another group, the row says so before you
// commit, because a silent transfer is how an estate quietly loses a pub.

import { useMemo, useState } from 'react';
import { ArrowRight, Loader2, MapPin, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Venue, VenueGroup, VenueTenure } from '@/lib/services/godmode-service';
import { useGodmodeVenues, useSetVenueGroup, useVenueGroupEstate } from '../lib/queries';

const TENURE_LABEL: Record<string, string> = {
  owned: 'Owned',
  independent: 'Independent',
  unknown: 'Not checked',
};

/** How many search hits to show. A long list in a panel is not a search. */
const MAX_HITS = 8;

interface Props {
  group: VenueGroup;
}

export default function GroupEstate({ group }: Props) {
  const { toast } = useToast();
  const estateQuery = useVenueGroupEstate(group.slug);
  const venuesQuery = useGodmodeVenues();
  const setGroup = useSetVenueGroup();

  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const members: Venue[] = estateQuery.data?.venues ?? [];
  const memberIds = useMemo(() => new Set(members.map((v) => v.id)), [members]);

  const hits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    const all = venuesQuery.data ?? [];
    return all
      .filter((v) => !memberIds.has(v.id))
      .filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          (v.postcode ?? '').toLowerCase().includes(q) ||
          (v.address ?? '').toLowerCase().includes(q),
      )
      .slice(0, MAX_HITS);
  }, [search, venuesQuery.data, memberIds]);

  const assign = async (venue: Venue, ownerGroupId: string | null, tenure?: VenueTenure) => {
    setBusyId(venue.id);
    try {
      await setGroup.mutateAsync({ venueId: venue.id, ownerGroupId, tenure });
      toast({
        title: ownerGroupId ? `${venue.name} added to ${group.name}` : `${venue.name} removed from ${group.name}`,
      });
      if (ownerGroupId) setSearch('');
    } catch (err) {
      toast({
        title: 'That did not save',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3 border-t bg-muted/30 px-4 py-3">
      {/* ---- add ---- */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Add a venue by name, address or postcode…"
            className="h-8 pl-8 text-sm"
          />
        </div>

        {search.trim().length >= 2 && (
          <div className="rounded-md border bg-card">
            {venuesQuery.isLoading ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">Loading venues…</p>
            ) : hits.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No venue matches, or every match is already in this group.
              </p>
            ) : (
              hits.map((v) => {
                const inOther = Boolean(v.ownerGroupId) && v.ownerGroupId !== group.id;
                return (
                  <div key={v.id} className="flex items-center gap-2 border-b px-3 py-1.5 last:border-b-0">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{v.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[v.address, v.postcode].filter(Boolean).join(', ')}
                      </span>
                    </span>
                    {inOther && (
                      // A venue has one owner. Say whose it is before you take it.
                      <span className="flex shrink-0 items-center gap-1 text-xs text-amber-500">
                        {v.ownerGroupName ?? 'Another group'}
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant={inOther ? 'outline' : 'ghost'}
                      className="h-7 shrink-0 px-2"
                      disabled={busyId === v.id}
                      onClick={() => assign(v, group.id, 'owned')}
                    >
                      {busyId === v.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          {inOther ? 'Move' : 'Add'}
                        </>
                      )}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ---- members ---- */}
      {estateQuery.isLoading ? (
        <p className="py-3 text-sm text-muted-foreground">Loading the estate…</p>
      ) : estateQuery.isError ? (
        <p className="py-3 text-sm text-destructive">{(estateQuery.error as Error).message}</p>
      ) : members.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">
          No venues in this group yet. Search above, or use the bulk action on the Venues page.
        </p>
      ) : (
        <div className="max-h-80 overflow-auto rounded-md border bg-card">
          <table className="w-full text-sm">
            <tbody>
              {members.map((v) => (
                <tr key={v.id} className="border-b last:border-b-0 hover:bg-muted/50">
                  <td className="max-w-0 truncate px-3 py-1.5 font-medium">{v.name}</td>
                  <td className="w-64 max-w-0 truncate px-3 py-1.5 text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{v.address || 'No address'}</span>
                    </span>
                  </td>
                  <td className="w-24 px-3 py-1.5 text-muted-foreground">{v.postcode || ''}</td>
                  <td className="w-28 px-3 py-1.5 text-muted-foreground">
                    {TENURE_LABEL[v.tenure ?? 'unknown']}
                  </td>
                  <td className="w-10 px-3 py-1.5 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      title={`Remove ${v.name} from ${group.name}`}
                      disabled={busyId === v.id}
                      onClick={() => assign(v, null)}
                    >
                      {busyId === v.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {members.length.toLocaleString()} in the estate. Remove clears the owner group and resets tenure to Not
        checked. It never deletes the venue.
      </p>
    </div>
  );
}
