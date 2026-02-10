import { useState, useEffect } from 'react';
import { Calendar, RefreshCw, Edit, Trash2, MapPin, User, Clock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  getAllEvents,
  updateEvent,
  deleteEvent,
  type Event,
} from '@/lib/services/godmode-service';
import { useConfirm } from '@/hooks/use-confirm';
import EventEditModal from '../components/EventEditModal';

type EventFilter = 'all' | 'gig' | 'upcoming' | 'past';

export default function EventsPage() {
  const { confirm, ConfirmDialog } = useConfirm();

  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventFilter, setEventFilter] = useState<EventFilter>('all');
  const [eventSearch, setEventSearch] = useState('');
  const [deletingEvent, setDeletingEvent] = useState<string | null>(null);
  const [eventPage, setEventPage] = useState(1);
  const eventsPerPage = 25;

  const [eventEditModalOpen, setEventEditModalOpen] = useState(false);
  const [eventEditIndex, setEventEditIndex] = useState(0);

  const fetchEvents = async () => {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const data = await getAllEvents();
      const sorted = [...data].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setEvents(sorted);
    } catch (err) {
      setEventsError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    setEventPage(1);
  }, [eventSearch, eventFilter]);

  const handleEventEditStart = (event: Event) => {
    const eventIndex = filteredEvents.findIndex(e => e.id === event.id);
    if (eventIndex >= 0) {
      setEventEditIndex(eventIndex);
      setEventEditModalOpen(true);
    }
  };

  const handleEventDelete = async (event: Event) => {
    if (!event.artistId) {
      setEventsError('Cannot delete event without artistId');
      return;
    }

    const confirmed = await confirm({
      title: 'Delete Event',
      description: `Are you sure you want to delete "${event.title || 'this event'}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setDeletingEvent(event.id);
    try {
      await deleteEvent(event.artistId, event.id);
      setEvents(events.filter(e => e.id !== event.id));
    } catch (err) {
      setEventsError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingEvent(null);
    }
  };

  const handleEventBatchSave = async (event: Event) => {
    if (!event.artistId) {
      throw new Error('Cannot update event without artistId');
    }
    const updated = await updateEvent(event.artistId, event.id, event);
    setEvents(events.map(e => e.id === updated.id ? updated : e));
  };

  const today = new Date().toISOString().split('T')[0];

  const filteredEvents = events.filter(e => {
    const matchesSearch =
      (e.title && e.title.toLowerCase().includes(eventSearch.toLowerCase())) ||
      (e.artistName && e.artistName.toLowerCase().includes(eventSearch.toLowerCase())) ||
      (e.venueName && e.venueName.toLowerCase().includes(eventSearch.toLowerCase())) ||
      (e.location && e.location.toLowerCase().includes(eventSearch.toLowerCase()));
    if (!matchesSearch) return false;

    if (eventFilter === 'gig') return e.type === 'gig';
    if (eventFilter === 'upcoming') return e.date >= today;
    if (eventFilter === 'past') return e.date < today;
    return true;
  });

  const eventTotalPages = Math.ceil(filteredEvents.length / eventsPerPage);
  const eventStartIndex = (eventPage - 1) * eventsPerPage;
  const paginatedEvents = filteredEvents.slice(eventStartIndex, eventStartIndex + eventsPerPage);

  const eventStats = {
    total: events.length,
    gigs: events.filter(e => e.type === 'gig').length,
    upcoming: events.filter(e => e.date >= today).length,
    past: events.filter(e => e.date < today).length,
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (startTime?: string, endTime?: string) => {
    if (!startTime) return null;
    if (endTime) return `${startTime} - ${endTime}`;
    return startTime;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Events
          </h1>
          <p className="text-muted-foreground mt-1">View and manage public events across the platform</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Input
            placeholder="Search events by title, artist, venue..."
            value={eventSearch}
            onChange={(e) => setEventSearch(e.target.value)}
            className="max-w-md"
          />
          <Button onClick={fetchEvents} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={eventFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setEventFilter('all')}
            size="sm"
          >
            All ({eventStats.total})
          </Button>
          <Button
            variant={eventFilter === 'gig' ? 'default' : 'outline'}
            onClick={() => setEventFilter('gig')}
            size="sm"
          >
            Gigs ({eventStats.gigs})
          </Button>
          <Button
            variant={eventFilter === 'upcoming' ? 'default' : 'outline'}
            onClick={() => setEventFilter('upcoming')}
            size="sm"
          >
            Upcoming ({eventStats.upcoming})
          </Button>
          <Button
            variant={eventFilter === 'past' ? 'default' : 'outline'}
            onClick={() => setEventFilter('past')}
            size="sm"
          >
            Past ({eventStats.past})
          </Button>
        </div>
      </div>

      {eventsLoading && <div className="text-center py-12"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div>}
      {eventsError && <div className="text-destructive text-center py-12">{eventsError}</div>}

      {!eventsLoading && !eventsError && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Artist</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Venue</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Public</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedEvents.map(event => (
                  <tr key={event.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">{formatDate(event.date)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium max-w-xs truncate">{event.title || '(No title)'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        event.type === 'gig' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        event.type === 'practice' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        event.type === 'open-mic' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                        event.type === 'festival' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}>
                        {event.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="max-w-[150px] truncate">{event.artistName || '(Unknown)'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="max-w-[150px] truncate">
                          {event.venueName || event.location || '(No venue)'}
                        </span>
                      </div>
                      {event.venue?.city && (
                        <div className="text-xs text-muted-foreground ml-4">{event.venue.city}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {formatTime(event.startTime, event.endTime) ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {formatTime(event.startTime, event.endTime)}
                        </div>
                      ) : event.isAllDay ? (
                        <span className="text-xs text-muted-foreground">All day</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {event.isPublic ? (
                        <Eye className="h-4 w-4 text-green-500" title="Public" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" title="Private" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEventEditStart(event)}
                          title="Edit event details"
                          disabled={!event.artistId}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleEventDelete(event)}
                          disabled={deletingEvent === event.id || !event.artistId}
                          title="Delete event"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedEvents.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      No events found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {eventTotalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {eventStartIndex + 1}-{Math.min(eventStartIndex + eventsPerPage, filteredEvents.length)} of {filteredEvents.length} events
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEventPage(p => Math.max(1, p - 1))}
                  disabled={eventPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-2 px-3">
                  <span className="text-sm">Page {eventPage} of {eventTotalPages}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEventPage(p => Math.min(eventTotalPages, p + 1))}
                  disabled={eventPage === eventTotalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <ConfirmDialog />

      {eventEditModalOpen && filteredEvents.length > 0 && (
        <EventEditModal
          open={eventEditModalOpen}
          onClose={() => setEventEditModalOpen(false)}
          events={filteredEvents}
          currentIndex={eventEditIndex}
          onSave={handleEventBatchSave}
          onNavigate={setEventEditIndex}
          onDelete={handleEventDelete}
        />
      )}
    </div>
  );
}
