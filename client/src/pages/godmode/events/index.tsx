// Godmode › Events — dense curation table over the public events feed.

import { useMemo, useState } from 'react';
import { Calendar, Edit, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/use-confirm';
import { useToast } from '@/hooks/use-toast';
import type { Event } from '@/lib/services/godmode-service';
import DataTable, { type Column } from '../components/DataTable';
import {
  BulkActionBar,
  FacetChips,
  GodmodePageHeader,
  TableSearch,
  useInitialUrlFilter,
} from '../components/godmode-ui';
import { useDeleteEvent, useGodmodeEvents, useUpdateEvent } from '../lib/queries';
import EventEditModal from '../components/EventEditModal';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export default function EventsPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const { toast } = useToast();

  const eventsQuery = useGodmodeEvents();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const events = eventsQuery.data ?? [];

  const [facet, setFacet] = useInitialUrlFilter('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editIndex, setEditIndex] = useState<number | null>(null);

  // Local calendar date, not UTC — during BST the ISO date flips an hour early.
  const today = new Date().toLocaleDateString('en-CA');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (q) {
        const hit =
          (e.title && e.title.toLowerCase().includes(q)) ||
          (e.artistName && e.artistName.toLowerCase().includes(q)) ||
          (e.venueName && e.venueName.toLowerCase().includes(q)) ||
          (e.location && e.location.toLowerCase().includes(q));
        if (!hit) return false;
      }
      switch (facet) {
        case 'gig': return e.type === 'gig';
        case 'upcoming': return e.date >= today;
        case 'past': return e.date < today;
        case 'private': return e.isPublic === false;
        default: return true;
      }
    });
  }, [events, search, facet, today]);

  const facets = useMemo(
    () => [
      { value: 'all', label: 'All', count: events.length },
      { value: 'upcoming', label: 'Upcoming', count: events.filter((e) => e.date >= today).length },
      { value: 'past', label: 'Past', count: events.filter((e) => e.date < today).length },
      { value: 'gig', label: 'Gigs', count: events.filter((e) => e.type === 'gig').length },
      { value: 'private', label: 'Not public', count: events.filter((e) => e.isPublic === false).length, warn: true },
    ],
    [events, today],
  );

  const handleDelete = async (event: Event) => {
    if (!event.artistId) {
      toast({ title: 'Cannot delete', description: 'Event has no artistId.', variant: 'destructive' });
      return;
    }
    const confirmed = await confirm({
      title: 'Delete Event',
      description: `Delete "${event.title || `${event.artistName ?? 'event'} @ ${event.venueName ?? '?'}`}"? This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;
    try {
      await deleteEvent.mutateAsync({ artistId: event.artistId, eventId: event.id });
      toast({ title: 'Event deleted' });
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const togglePublic = async (event: Event) => {
    if (!event.artistId) {
      toast({ title: 'Cannot update', description: 'Event has no artistId.', variant: 'destructive' });
      return;
    }
    try {
      await updateEvent.mutateAsync({
        artistId: event.artistId,
        eventId: event.id,
        data: { isPublic: !(event.isPublic !== false) },
      });
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const selectedEvents = filtered.filter((e) => selected.has(e.id));

  const bulkDelete = async () => {
    const deletable = selectedEvents.filter((e) => e.artistId);
    const confirmed = await confirm({
      title: `Delete ${deletable.length} events`,
      description:
        selectedEvents.length !== deletable.length
          ? `${selectedEvents.length - deletable.length} selected event(s) have no artistId and will be skipped. This cannot be undone.`
          : 'This cannot be undone.',
      confirmText: `Delete ${deletable.length}`,
      variant: 'destructive',
    });
    if (!confirmed) return;
    let deleted = 0;
    let failed = 0;
    for (const event of deletable) {
      try {
        await deleteEvent.mutateAsync({ artistId: event.artistId!, eventId: event.id });
        deleted++;
      } catch {
        failed++;
      }
    }
    toast({
      title: `Deleted ${deleted} event(s)`,
      description: failed > 0 ? `${failed} failed.` : undefined,
    });
    setSelected(new Set());
  };

  const bulkSetPublic = async (isPublic: boolean) => {
    const updatable = selectedEvents.filter((e) => e.artistId && (e.isPublic !== false) !== isPublic);
    let updated = 0;
    for (const event of updatable) {
      try {
        await updateEvent.mutateAsync({ artistId: event.artistId!, eventId: event.id, data: { isPublic } });
        updated++;
      } catch {
        // reported in summary
      }
    }
    toast({ title: `${isPublic ? 'Published' : 'Unpublished'} ${updated} event(s)` });
    setSelected(new Set());
  };

  const columns: Column<Event>[] = [
    {
      key: 'date',
      header: 'Date',
      widthClass: 'w-40',
      sortValue: (e) => e.date,
      render: (e) => (
        <span className={e.date < today ? 'text-muted-foreground' : ''}>
          {formatDate(e.date)}
        </span>
      ),
    },
    {
      key: 'time',
      header: 'Time',
      widthClass: 'w-24',
      className: 'hidden lg:table-cell',
      sortValue: (e) => e.startTime,
      render: (e) =>
        e.startTime ? (
          <span className="text-muted-foreground tabular-nums">
            {e.startTime}
            {e.endTime && `–${e.endTime}`}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'artist',
      header: 'Artist',
      sortValue: (e) => e.artistName,
      render: (e) => <span className="font-medium truncate">{e.artistName || '—'}</span>,
    },
    {
      key: 'venue',
      header: 'Venue',
      sortValue: (e) => e.venueName,
      render: (e) => (
        <span className="text-muted-foreground truncate">
          {e.venueName || e.location || '—'}
          {e.venue?.city ? `, ${e.venue.city}` : ''}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      widthClass: 'w-24',
      className: 'hidden xl:table-cell',
      sortValue: (e) => e.type,
      render: (e) => <span className="text-muted-foreground">{e.type}</span>,
    },
    {
      key: 'public',
      header: 'Public',
      widthClass: 'w-16',
      sortValue: (e) => (e.isPublic !== false ? 1 : 0),
      render: (e) => (
        <span onClick={(ev) => ev.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            title={e.isPublic !== false ? 'Public — click to hide' : 'Hidden — click to publish'}
            onClick={() => togglePublic(e)}
          >
            {e.isPublic !== false ? (
              <Eye className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-orange-500" />
            )}
          </Button>
        </span>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      widthClass: 'w-28',
      className: 'hidden xl:table-cell',
      sortValue: (e) => e.createdAt,
      render: (e) => (
        <span className="text-muted-foreground text-xs">
          {e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-GB') : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      widthClass: 'w-20',
      render: (e) => (
        <span className="flex items-center justify-end gap-1" onClick={(ev) => ev.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            title="Edit"
            onClick={() => setEditIndex(filtered.findIndex((x) => x.id === e.id))}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            title="Delete"
            onClick={() => handleDelete(e)}
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
        icon={Calendar}
        title="Events"
        count={`${filtered.length.toLocaleString()} of ${events.length.toLocaleString()}`}
        isFetching={eventsQuery.isFetching}
        onRefresh={() => eventsQuery.refetch()}
      />

      <div className="flex flex-wrap items-center gap-3">
        <TableSearch
          value={search}
          onChange={(v) => { setSearch(v); setSelected(new Set()); }}
          placeholder="Search title, artist, venue…"
        />
        <FacetChips facets={facets} active={facet} onChange={(v) => { setFacet(v); setSelected(new Set()); }} />
      </div>

      {eventsQuery.isError ? (
        <div className="py-12 text-center text-destructive">{(eventsQuery.error as Error).message}</div>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(e) => e.id}
          selected={selected}
          onSelectedChange={setSelected}
          onRowClick={(e) => setEditIndex(filtered.findIndex((x) => x.id === e.id))}
          defaultSort={{ key: 'date', dir: 'asc' }}
          emptyMessage={eventsQuery.isLoading ? 'Loading events…' : 'No events match the current filters.'}
        />
      )}

      <BulkActionBar count={selectedEvents.length} onClear={() => setSelected(new Set())}>
        <Button size="sm" variant="secondary" onClick={() => bulkSetPublic(true)}>
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          Publish
        </Button>
        <Button size="sm" variant="secondary" onClick={() => bulkSetPublic(false)}>
          <EyeOff className="mr-1.5 h-3.5 w-3.5" />
          Unpublish
        </Button>
        <Button size="sm" variant="destructive" onClick={bulkDelete}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
      </BulkActionBar>

      <ConfirmDialog />

      {editIndex !== null && filtered.length > 0 && (
        <EventEditModal
          open={editIndex !== null}
          onClose={() => setEditIndex(null)}
          events={filtered}
          currentIndex={Math.min(editIndex, filtered.length - 1)}
          onSave={async (event) => {
            if (!event.artistId) throw new Error('Cannot update event without artistId');
            await updateEvent.mutateAsync({ artistId: event.artistId, eventId: event.id, data: event });
          }}
          onNavigate={setEditIndex}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
