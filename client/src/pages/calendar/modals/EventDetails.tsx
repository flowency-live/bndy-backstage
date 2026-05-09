import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EVENT_TYPE_CONFIG, PAYMENT_METHOD_CONFIG, type PaymentMethod } from '@/types/api';
import { RecurringIndicator } from '../components/RecurringIndicator';
import { formatRecurringPattern } from '../utils/recurringCalculations';
import { AddToCalendarButton } from '@/components/ui/add-to-calendar-button';
import type { Event, ArtistMembership } from '@/types/api';

interface EventDetailsProps {
  event: Event | null;
  open: boolean;
  onClose: () => void;
  onEdit: (event: Event) => void;
  onDelete: (event: Event, deleteAll?: boolean) => void;
  onLeave?: (event: Event) => void;
  artistMembers: ArtistMembership[];
  currentMembershipId: string | null;
  currentUserId: string | null;
  canEdit: (event: Event) => boolean;
  canDelete?: (event: Event) => boolean;
  canLeave?: (event: Event) => boolean;
  artistId?: string | null;
}

export default function EventDetails({
  event,
  open,
  onClose,
  onEdit,
  onDelete,
  onLeave,
  artistMembers,
  currentMembershipId,
  currentUserId,
  canEdit,
  canDelete,
  canLeave,
  artistId,
}: EventDetailsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'single' | 'all'>('single');
  const [activeTab, setActiveTab] = useState<'details' | 'finances'>('details');

  if (!event) return null;

  const eventConfig =
    EVENT_TYPE_CONFIG[event.type as keyof typeof EVENT_TYPE_CONFIG] ||
    EVENT_TYPE_CONFIG.practice;

  // Safe lookup: artistMembers might not include cross-artist event members
  // For cross-artist unavailability, rely on event.displayName from API
  const eventMember = event.membershipId && Array.isArray(artistMembers)
    ? artistMembers.find(
        (m) => m.membership_id === event.membershipId || m.user_id === event.membershipId
      )
    : null;
  const canEditEvent = canEdit(event);

  // For unavailability events, check ownerUserId; for others, check membershipId
  const isOwner =
    event.type === 'unavailable'
      ? event.ownerUserId === currentUserId
      : event.membershipId === currentMembershipId;

  // Check if this is a recurring event
  const eventRecurring = (event as any).recurring;
  const isRecurring = !!(eventRecurring && eventRecurring.type && eventRecurring.type !== 'none');
  const isRecurringInstance = !!(event as any).isRecurringInstance;

  // Check if this is a cross-artist unavailability event
  const isCrossArtistUnavailability =
    event.type === 'unavailable' &&
    ((event as any).crossArtistEvent === true ||
      !!(event.venue || (event.location && event.startTime)));

  // Check if this event has fee information (show Finance tab for gigs)
  const isGig = event.type === 'gig' || event.type === 'public_gig';
  const hasFeeInfo = isGig && (event.agreedFee !== undefined || event.noFee);

  const formatEventDate = (
    date: string,
    endDate?: string,
    startTime?: string,
    endTime?: string
  ) => {
    // UK DATE FORMAT RULE: Always use dd/MM/yyyy format
    const start = parseISO(date + 'T00:00:00');
    let dateStr = format(start, 'EEEE, do MMMM yyyy'); // UK format: Monday, 1st January 2025

    if (endDate && endDate !== date) {
      const end = parseISO(endDate + 'T00:00:00');
      dateStr += ` - ${format(end, 'EEEE, do MMMM yyyy')}`;
    }

    if (startTime) {
      dateStr += ` at ${startTime}`;
      if (endTime && endTime !== startTime) {
        dateStr += ` - ${endTime}`;
      }
    }

    return dateStr;
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      // Execute delete with selected mode
      onDelete(event, deleteMode === 'all');
      setShowDeleteConfirm(false);
      setDeleteMode('single');
      onClose();
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const handleEdit = () => {
    onEdit(event);
    // Don't call onClose() here - it clears selectedEvent before the wizard can use it
    // The wizard will close EventDetails via its own onClose handler
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="event-details-modal">
        <DialogHeader
          className={
            event.type === 'unavailable'
              ? 'bg-red-50 dark:bg-red-950/30 -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg'
              : ''
          }
        >
          <DialogTitle
            className={`flex items-center gap-2 ${event.type === 'unavailable' ? 'text-red-900 dark:text-red-100' : ''}`}
          >
            <span className="text-2xl">{eventConfig.icon}</span>
            <div className="flex-1">
              <div className="font-serif text-xl flex items-center gap-2">
                {event.type === 'unavailable' && event.displayName
                  ? `${event.displayName} - Unavailable`
                  : event.title || eventConfig.label}
                {isRecurring && (
                  <RecurringIndicator
                    recurring={eventRecurring}
                    size="sm"
                    showTooltip={true}
                  />
                )}
              </div>
              {event.type !== 'unavailable' && (
                <Badge
                  variant="secondary"
                  className="text-xs mt-1"
                  style={{
                    backgroundColor: eventConfig.color + '20',
                    color: eventConfig.color,
                  }}
                >
                  {eventConfig.label}
                </Badge>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            View event details and manage this calendar entry
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tabs for gigs with fee info */}
          {hasFeeInfo ? (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'details' | 'finances')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="finances" className="gap-1">
                  Finances
                  {event.datePaid && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                      Paid
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                {/* Recurring pattern display */}
                {isRecurring && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                      Recurring Pattern
                    </h4>
                    <p className="text-sm">{formatRecurringPattern(eventRecurring)}</p>
                  </div>
                )}

                {/* Date and time */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">Date & Time</h4>
                  <p className="text-sm">
                    {formatEventDate(
                      event.date,
                      event.endDate || undefined,
                      event.startTime || undefined,
                      event.endTime || undefined
                    )}
                  </p>
                </div>

                {/* Location/Venue */}
                {(event.location || event.venue) && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1">Venue</h4>
                    {event.venue ? (
                      <a
                        href={
                          event.venueGooglePlaceId
                            ? `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${event.venueGooglePlaceId}`
                            : event.venueLatitude && event.venueLongitude
                              ? `https://www.google.com/maps/search/?api=1&query=${event.venueLatitude},${event.venueLongitude}`
                              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <i className="fas fa-map-marker-alt"></i>
                        {event.venue}
                        <i className="fas fa-external-link-alt text-xs"></i>
                      </a>
                    ) : (
                      <p className="text-sm">{event.location}</p>
                    )}
                  </div>
                )}

                {/* Multi-artist display */}
                {event.artistNames && event.artistNames.length > 1 && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                      Artists ({event.artistNames.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {event.artistNames.map((name, index) => (
                        <Badge
                          key={index}
                          variant={index === 0 ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {name}
                          {index === 0 && <span className="ml-1 opacity-60">(lead)</span>}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {event.notes && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1">Notes</h4>
                    <p className="text-sm whitespace-pre-wrap">{event.notes}</p>
                  </div>
                )}

                {/* Public indicator */}
                {event.isPublic && (
                  <div>
                    <Badge variant="outline" className="text-xs">
                      <i className="fas fa-globe mr-1"></i>
                      Public Event
                    </Badge>
                  </div>
                )}

                {/* Add to Calendar */}
                {artistId && (
                  <div className="flex justify-end">
                    <AddToCalendarButton
                      event={{
                        id: event.id,
                        artistId: event.artistId || artistId,
                        type: event.type as 'gig' | 'practice' | 'recording' | 'other',
                        title: event.title,
                        venue: event.venue,
                        location: event.location,
                        date: event.date,
                        startTime: event.startTime,
                        endTime: event.endTime,
                        notes: event.notes,
                        createdAt: event.createdAt || '',
                        updatedAt: event.updatedAt || '',
                      }}
                      artistId={artistId}
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="finances" className="space-y-4 mt-4">
                {/* Fee Status Header */}
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <i className="fas fa-pound-sign text-emerald-600"></i>
                    Fee Information
                  </h4>
                  {event.datePaid ? (
                    <Badge className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border-emerald-300">
                      <i className="fas fa-check mr-1"></i>
                      Paid
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      <i className="fas fa-clock mr-1"></i>
                      Unpaid
                    </Badge>
                  )}
                </div>

                {/* Fee Amounts */}
                {event.noFee ? (
                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <i className="fas fa-info-circle mr-2"></i>
                      No guaranteed fee for this gig
                    </p>
                    {event.actualFee !== undefined && event.actualFee > 0 && (
                      <p className="text-sm mt-2">
                        <span className="text-muted-foreground">Actual received:</span>
                        <span className="ml-2 font-semibold text-emerald-600">£{event.actualFee.toFixed(2)}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Agreed Fee</span>
                      <span className="text-lg font-semibold">£{(event.agreedFee || 0).toFixed(2)}</span>
                    </div>
                    {event.actualFee !== undefined && event.actualFee !== event.agreedFee && (
                      <div className="flex justify-between items-center pt-2 border-t border-border">
                        <span className="text-sm text-muted-foreground">Actual Received</span>
                        <span className="text-lg font-semibold text-emerald-600">£{event.actualFee.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Details */}
                {event.datePaid && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-muted-foreground">Payment Details</h5>
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Date Paid</span>
                        <span>{format(parseISO(event.datePaid), 'dd MMM yyyy')}</span>
                      </div>
                      {event.paymentMethod && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Method</span>
                          <span>{PAYMENT_METHOD_CONFIG[event.paymentMethod as PaymentMethod]?.label || event.paymentMethod}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Split indicator */}
                {event.splitBetweenMembers && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <i className="fas fa-users"></i>
                    <span>Fee split between all members</span>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            /* Non-gig events - no tabs needed */
            <>
              {/* Recurring pattern display */}
              {isRecurring && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                    Recurring Pattern
                  </h4>
                  <p className="text-sm">{formatRecurringPattern(eventRecurring)}</p>
                </div>
              )}

              {/* Date and time - hide time for cross-artist unavailability */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">Date & Time</h4>
                <p className="text-sm">
                  {isCrossArtistUnavailability
                    ? formatEventDate(event.date, event.endDate || undefined)
                    : formatEventDate(
                        event.date,
                        event.endDate || undefined,
                        event.startTime || undefined,
                        event.endTime || undefined
                      )}
                </p>
              </div>

              {/* Location/Venue - hide for cross-artist unavailability */}
              {!isCrossArtistUnavailability && (event.location || event.venue) && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                    {event.type === 'gig' ? 'Venue' : 'Location'}
                  </h4>
                  {event.type === 'gig' && event.venue ? (
                    <a
                      href={
                        event.venueGooglePlaceId
                          ? `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${event.venueGooglePlaceId}`
                          : event.venueLatitude && event.venueLongitude
                            ? `https://www.google.com/maps/search/?api=1&query=${event.venueLatitude},${event.venueLongitude}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <i className="fas fa-map-marker-alt"></i>
                      {event.venue}
                      <i className="fas fa-external-link-alt text-xs"></i>
                    </a>
                  ) : (
                    <p className="text-sm">{event.location || event.venue}</p>
                  )}
                </div>
              )}

              {/* Multi-artist display - show all artists for multi-artist events */}
              {event.artistNames && event.artistNames.length > 1 && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                    Artists ({event.artistNames.length})
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {event.artistNames.map((name, index) => (
                      <Badge
                        key={index}
                        variant={index === 0 ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {name}
                        {index === 0 && <span className="ml-1 opacity-60">(lead)</span>}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {event.notes && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">Notes</h4>
                  <p className="text-sm whitespace-pre-wrap">{event.notes}</p>
                </div>
              )}

              {/* Public indicator - hide for cross-artist unavailability */}
              {!isCrossArtistUnavailability && event.isPublic && (
                <div>
                  <Badge variant="outline" className="text-xs">
                    <i className="fas fa-globe mr-1"></i>
                    Public Event
                  </Badge>
                </div>
              )}

              {/* Add to Calendar - show for gigs and practices, hide for unavailability */}
              {event.type !== 'unavailable' && artistId && (
                <div className="flex justify-end">
                  <AddToCalendarButton
                    event={{
                      id: event.id,
                      artistId: event.artistId || artistId,
                      type: event.type as 'gig' | 'practice' | 'recording' | 'other',
                      title: event.title,
                      venue: event.venue,
                      location: event.location,
                      date: event.date,
                      startTime: event.startTime,
                      endTime: event.endTime,
                      notes: event.notes,
                      createdAt: event.createdAt || '',
                      updatedAt: event.updatedAt || '',
                    }}
                    artistId={artistId}
                  />
                </div>
              )}
            </>
          )}

          <Separator />

          {/* Delete mode selector for recurring events */}
          {showDeleteConfirm && isRecurring && (
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium">Delete options:</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="deleteMode"
                    value="single"
                    checked={deleteMode === 'single'}
                    onChange={() => setDeleteMode('single')}
                    className="accent-destructive"
                  />
                  <span className="text-sm">Delete this event only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="deleteMode"
                    value="all"
                    checked={deleteMode === 'all'}
                    onChange={() => setDeleteMode('all')}
                    className="accent-destructive"
                  />
                  <span className="text-sm">Delete all events in this series</span>
                </label>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {canEditEvent && (
              <Button
                onClick={handleEdit}
                variant="action"
                className="flex-1"
                data-testid="button-edit-event"
              >
                <i className="fas fa-edit mr-2"></i>
                Edit
              </Button>
            )}

            {/* Delete button - only for primary artist (owner) */}
            {canDelete?.(event) && (
              <Button
                onClick={handleDelete}
                variant={showDeleteConfirm ? 'destructive' : 'outline'}
                data-testid="button-delete-event"
              >
                {showDeleteConfirm ? (
                  <>
                    <i className="fas fa-check mr-2"></i>
                    Confirm
                  </>
                ) : (
                  <>
                    <i className="fas fa-trash mr-2"></i>
                    Delete
                  </>
                )}
              </Button>
            )}

            {/* Leave button - only for collaborating artists */}
            {canLeave?.(event) && onLeave && (
              <Button
                onClick={() => {
                  onLeave(event);
                  onClose();
                }}
                variant="outline"
                data-testid="button-leave-event"
              >
                <i className="fas fa-sign-out-alt mr-2"></i>
                Leave Event
              </Button>
            )}

            {/* Fallback for canEdit without canDelete (backwards compatibility) */}
            {canEditEvent && !canDelete && !canLeave && (
              <Button
                onClick={handleDelete}
                variant={showDeleteConfirm ? 'destructive' : 'outline'}
                data-testid="button-delete-event"
              >
                {showDeleteConfirm ? (
                  <>
                    <i className="fas fa-check mr-2"></i>
                    Confirm
                  </>
                ) : (
                  <>
                    <i className="fas fa-trash mr-2"></i>
                    Delete
                  </>
                )}
              </Button>
            )}

            {!canEditEvent && event.type === 'unavailable' && !isOwner && (
              <div className="text-xs text-muted-foreground italic flex-1">
                <i className="fas fa-lock mr-1"></i>
                Only{' '}
                {event.displayName ||
                  eventMember?.resolved_display_name ||
                  eventMember?.displayName ||
                  'the member'}{' '}
                can edit this unavailability
              </div>
            )}
          </div>

          {showDeleteConfirm && (
            <div className="text-xs text-muted-foreground text-center">
              {isRecurring
                ? deleteMode === 'all'
                  ? 'Click Confirm again to permanently delete ALL events in this series'
                  : 'Click Confirm again to permanently delete THIS event only'
                : 'Click Confirm again to permanently delete this event'}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
