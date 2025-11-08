import { useState } from "react"
import { format, parseISO } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { EVENT_TYPE_CONFIG } from "@/types/api"
import type { Event, ArtistMembership } from "@/types/api"

interface EventDetailsProps {
  event: Event | null
  open: boolean
  onClose: () => void
  onEdit: (event: Event) => void
  onDelete: (event: Event) => void
  artistMembers: Array<ArtistMembership & { user: { id: string, displayName: string | null } }>
  currentMembershipId: string | null
  currentUserId: string | null
  canEdit: (event: Event) => boolean
}

export default function EventDetails({
  event,
  open,
  onClose,
  onEdit,
  onDelete,
  artistMembers,
  currentMembershipId,
  currentUserId,
  canEdit
}: EventDetailsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!event) return null

  const eventConfig = EVENT_TYPE_CONFIG[event.type as keyof typeof EVENT_TYPE_CONFIG] || EVENT_TYPE_CONFIG.practice
  const eventMember = event.membershipId ? artistMembers.find(m => m.membership_id === event.membershipId || m.user_id === event.membershipId) : null
  const canEditEvent = canEdit(event)
  // For unavailability events, check ownerUserId; for others, check membershipId
  const isOwner = event.type === 'unavailable'
    ? event.ownerUserId === currentUserId
    : event.membershipId === currentMembershipId

  // Check if this is a cross-artist unavailability event (member unavailable due to another artist's event)
  // These events should hide time, location, and public badge to maintain privacy
  const isCrossArtistUnavailability = event.type === 'unavailable' && (
    (event as any).crossArtistEvent === true ||
    // If unavailability has venue/location info, it's likely a cross-artist event
    !!(event.venue || (event.location && event.startTime))
  )
  
  const formatEventDate = (date: string, endDate?: string, startTime?: string, endTime?: string) => {
    // UK DATE FORMAT RULE: Always use dd/MM/yyyy format for consistency across the entire app
    const start = parseISO(date + 'T00:00:00')
    let dateStr = format(start, 'EEEE, do MMMM yyyy') // UK format: Monday, 1st January 2025
    
    if (endDate && endDate !== date) {
      const end = parseISO(endDate + 'T00:00:00')
      dateStr += ` - ${format(end, 'EEEE, do MMMM yyyy')}`
    }
    
    if (startTime) {
      dateStr += ` at ${startTime}`
      if (endTime && endTime !== startTime) {
        dateStr += ` - ${endTime}`
      }
    }
    
    return dateStr
  }

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete(event)
      setShowDeleteConfirm(false)
      onClose()
    } else {
      setShowDeleteConfirm(true)
    }
  }

  const handleEdit = () => {
    onEdit(event)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="event-details-modal">
        <DialogHeader className={event.type === 'unavailable' ? 'bg-red-50 dark:bg-red-950/30 -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg' : ''}>
          <DialogTitle className={`flex items-center gap-2 ${event.type === 'unavailable' ? 'text-red-900 dark:text-red-100' : ''}`}>
            <span className="text-2xl">{eventConfig.icon}</span>
            <div>
              <div className="font-serif text-xl">
                {event.type === 'unavailable' && event.displayName
                  ? `${event.displayName} - Unavailable`
                  : event.title || eventConfig.label}
              </div>
              {event.type !== 'unavailable' && (
                <Badge
                  variant="secondary"
                  className="text-xs mt-1"
                  style={{ backgroundColor: eventConfig.color + '20', color: eventConfig.color }}
                >
                  {eventConfig.label}
                </Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date and time - hide time for cross-artist unavailability */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-1">Date & Time</h4>
            <p className="text-sm">
              {isCrossArtistUnavailability
                ? formatEventDate(event.date, event.endDate || undefined)
                : formatEventDate(event.date, event.endDate || undefined, event.startTime || undefined, event.endTime || undefined)}
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

          <Separator />

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
            
            {canEditEvent && (
              <Button
                onClick={handleDelete}
                variant={showDeleteConfirm ? "destructive" : "outline"}
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
                Only {event.displayName || eventMember?.user?.displayName?.trim() || eventMember?.displayName || 'the member'} can edit this unavailability
              </div>
            )}
          </div>
          
          {showDeleteConfirm && (
            <div className="text-xs text-muted-foreground text-center">
              Click Confirm again to permanently delete this event
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}