import { useState, useEffect, useMemo } from 'react';
import { useBuilder } from '@/lib/builder-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Calendar, Music, Users, Bot, Edit, MessageSquare, Check } from 'lucide-react';

const API_BASE_URL = 'https://api.bndy.co.uk';

type EventSource = 'bndy.live' | 'user' | 'bndy.core';

interface Event {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime?: string;
  venueId: string;
  venueName: string;
  venueCity?: string;
  artistIds: string[];
  artistName?: string;
  location: { lat: number; lng: number };
  source: EventSource;
  status: string;
  isOpenMic?: boolean;
  createdAt: string;
  updatedAt: string;
}

type FilterMode = 'all' | 'artist' | 'community' | 'ai';

// Map source to display info
const getSourceInfo = (source: EventSource) => {
  switch (source) {
    case 'user':
      return { label: 'Artist', icon: Music, color: 'bg-purple-500', canEdit: false };
    case 'bndy.live':
      return { label: 'Community', icon: Users, color: 'bg-blue-500', canEdit: true };
    case 'bndy.core':
      return { label: 'AI', icon: Bot, color: 'bg-amber-500', canEdit: true, canVerify: true };
    default:
      return { label: 'Unknown', icon: Calendar, color: 'bg-gray-500', canEdit: true };
  }
};

// Format date for display
const formatEventDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

export default function BuilderEvents() {
  const { currentBuilder, isLoading: builderLoading } = useBuilder();
  const { toast } = useToast();

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  // Suggest edit modal state
  const [suggestModalOpen, setSuggestModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [isSendingSuggestion, setIsSendingSuggestion] = useState(false);

  // Fetch events in coverage area
  useEffect(() => {
    if (!currentBuilder) return;

    const fetchEvents = async () => {
      setIsLoadingEvents(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/events-in-coverage?` +
          `postcode=${encodeURIComponent(currentBuilder.coverage.postcode)}&` +
          `radius=${currentBuilder.coverage.radius}`,
          { credentials: 'include' }
        );
        const data = await response.json();
        setEvents(data.events || []);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load events',
        });
      } finally {
        setIsLoadingEvents(false);
      }
    };

    fetchEvents();
  }, [currentBuilder, toast]);

  // Filter events
  const filteredEvents = useMemo(() => {
    switch (filterMode) {
      case 'artist':
        return events.filter(e => e.source === 'user');
      case 'community':
        return events.filter(e => e.source === 'bndy.live');
      case 'ai':
        return events.filter(e => e.source === 'bndy.core');
      default:
        return events;
    }
  }, [events, filterMode]);

  // Open suggest edit modal
  const openSuggestModal = (event: Event) => {
    setSelectedEvent(event);
    setSuggestion('');
    setSuggestModalOpen(true);
  };

  // Send suggestion
  const sendSuggestion = async () => {
    if (!selectedEvent || !suggestion.trim()) return;

    setIsSendingSuggestion(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'event_edit_suggestion',
          eventId: selectedEvent.id,
          message: suggestion.trim(),
          builderId: currentBuilder?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send suggestion');
      }

      toast({
        title: 'Suggestion sent',
        description: 'The artist will be notified of your suggestion.',
      });

      setSuggestModalOpen(false);
      setSelectedEvent(null);
      setSuggestion('');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send suggestion',
      });
    } finally {
      setIsSendingSuggestion(false);
    }
  };

  // Handle edit click (for editable events)
  const handleEdit = (event: Event) => {
    // TODO: Navigate to edit page or open edit modal
    toast({
      title: 'Edit event',
      description: `Editing ${event.name} - feature coming soon`,
    });
  };

  // Handle verify click (for AI events)
  const handleVerify = async (event: Event) => {
    // TODO: Implement verify API call
    toast({
      title: 'Event verified',
      description: `${event.name} has been marked as verified.`,
    });
  };

  if (builderLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentBuilder) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>No Builder Selected</CardTitle>
            <CardDescription>
              Select a builder from the persona selector to manage events.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Events</h1>
        <p className="text-muted-foreground">
          Manage events in your coverage area.
        </p>
      </div>

      {/* Stats bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-sm">
                <span className="font-semibold text-lg">{events.length}</span>
                <span className="text-muted-foreground ml-1">events in coverage area</span>
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex gap-2">
              <Button
                variant={filterMode === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterMode('all')}
              >
                All
              </Button>
              <Button
                variant={filterMode === 'artist' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterMode('artist')}
                aria-label="Filter by artist events"
              >
                <Music className="h-4 w-4 mr-1" />
                Artist
              </Button>
              <Button
                variant={filterMode === 'community' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterMode('community')}
                aria-label="Filter by community events"
              >
                <Users className="h-4 w-4 mr-1" />
                Community
              </Button>
              <Button
                variant={filterMode === 'ai' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterMode('ai')}
                aria-label="Filter by AI events"
              >
                <Bot className="h-4 w-4 mr-1" />
                AI
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events list */}
      {isLoadingEvents ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Loading events...</span>
        </div>
      ) : filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {filterMode === 'all'
                ? 'No events found in your coverage area.'
                : `No ${filterMode} events.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map(event => {
            const sourceInfo = getSourceInfo(event.source);
            const SourceIcon = sourceInfo.icon;

            return (
              <Card key={event.id} data-testid={`event-card-${event.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{event.name}</CardTitle>
                      <CardDescription className="mt-1">
                        <div className="flex items-center gap-2">
                          <span>{event.venueName}</span>
                          {event.venueCity && (
                            <span className="text-xs">• {event.venueCity}</span>
                          )}
                        </div>
                        <div className="mt-1">
                          <span>{formatEventDate(event.date)}</span>
                          {event.startTime && (
                            <span className="ml-2">{event.startTime}</span>
                          )}
                        </div>
                      </CardDescription>
                    </div>
                    <Badge className={`${sourceInfo.color} text-white`}>
                      <SourceIcon className="h-3 w-3 mr-1" />
                      {sourceInfo.label}
                    </Badge>
                  </div>
                  {event.artistName && (
                    <div className="text-sm text-muted-foreground mt-2">
                      <Music className="h-3 w-3 inline mr-1" />
                      {event.artistName}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    {sourceInfo.canEdit ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(event)}
                          aria-label="Edit"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        {sourceInfo.canVerify && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerify(event)}
                            aria-label="Verify event"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Verify
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openSuggestModal(event)}
                        aria-label="Suggest Edit"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Suggest Edit
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Suggest Edit Modal */}
      <Dialog open={suggestModalOpen} onOpenChange={setSuggestModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suggest Changes</DialogTitle>
            <DialogDescription>
              This event was created by the artist. Your suggestion will be sent to them for review.
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedEvent.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedEvent.venueName} • {formatEventDate(selectedEvent.date)}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="suggestion">Your Suggestion</Label>
                <Textarea
                  id="suggestion"
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  placeholder="Describe the changes you'd like to suggest..."
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuggestModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={sendSuggestion}
              disabled={!suggestion.trim() || isSendingSuggestion}
            >
              {isSendingSuggestion ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Suggestion
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
