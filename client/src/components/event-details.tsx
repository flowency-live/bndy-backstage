import { useState } from "react"
import { format, parseISO } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { EVENT_TYPE_CONFIG } from "@/types/api"
import type { Event, UserBand } from "@/types/api"

interface EventDetailsProps {
  event: Event | null
  open: boolean
  onClose: () => void
  onEdit: (event: Event) => void
  onDelete: (event: Event) => void
  bandMembers: Array<UserBand & { user: { id: string, displayName: string | null } }>
  currentMembershipId: string | null
  canEdit: (event: Event) => boolean
}

export default function EventDetails({
  event,
  open,
  onClose,
  onEdit,
  onDelete,
  bandMembers,
  currentMembershipId,
  canEdit
}: EventDetailsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!event) return null

  const eventConfig = EVENT_TYPE_CONFIG[event.type as keyof typeof EVENT_TYPE_CONFIG] || EVENT_TYPE_CONFIG.practice
  const eventMember = event.membershipId ? bandMembers.find(m => m.id === event.membershipId || m.userId === event.membershipId) : null
  const canEditEvent = canEdit(event)
  const isOwner = event.membershipId === currentMembershipId
  
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
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{eventConfig.icon}</span>
            <div>
              <div className="font-serif text-xl">
                {event.title || eventConfig.label}
              </div>
              <Badge 
                variant="secondary" 
                className="text-xs mt-1"
                style={{ backgroundColor: eventConfig.color + '20', color: eventConfig.color }}
              >
                {eventConfig.label}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date and time */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-1">Date & Time</h4>
            <p className="text-sm">
              {formatEventDate(event.date, event.endDate || undefined, event.startTime || undefined, event.endTime || undefined)}
            </p>
          </div>

          {/* Location */}
          {(event.location || event.venue) && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-1">Location</h4>
              <p className="text-sm">{event.location || event.venue}</p>
            </div>
          )}

          {/* Member (for unavailability) */}
          {event.type === 'unavailable' && eventMember && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-1">Member</h4>
              <div className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: eventMember.color }}
                >
                  <i className={`fas ${eventMember.icon}`}></i>
                </div>
                <span className="text-sm">
                  {eventMember.user?.displayName?.trim() || eventMember.displayName}
                </span>
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
                Only {eventMember?.user?.displayName?.trim() || eventMember?.displayName || 'the member'} can edit this unavailability
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