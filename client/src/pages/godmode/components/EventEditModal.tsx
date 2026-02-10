import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Save, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Event } from '@/lib/services/godmode-service';

interface EventEditModalProps {
  open: boolean;
  onClose: () => void;
  events: Event[];
  currentIndex: number;
  onSave: (event: Event) => Promise<void>;
  onNavigate: (index: number) => void;
  onDelete?: (event: Event) => Promise<void>;
}

const EVENT_TYPES = [
  { value: 'gig', label: 'Gig' },
  { value: 'practice', label: 'Practice' },
  { value: 'open-mic', label: 'Open Mic' },
  { value: 'festival', label: 'Festival' },
  { value: 'recording', label: 'Recording' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'other', label: 'Other' },
];

export default function EventEditModal({
  open,
  onClose,
  events,
  currentIndex,
  onSave,
  onNavigate,
  onDelete,
}: EventEditModalProps) {
  const { toast } = useToast();
  const [editForm, setEditForm] = useState<Event | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const currentEvent = events[currentIndex];

  useEffect(() => {
    if (currentEvent) {
      setEditForm({ ...currentEvent });
      setHasChanges(false);
    }
  }, [currentEvent]);

  const handleSave = async () => {
    if (!editForm || !hasChanges) return;

    setSaving(true);
    try {
      await onSave(editForm);
      setHasChanges(false);
      toast({
        title: 'Event updated',
        description: 'Changes saved successfully',
      });
      onClose();
    } catch (error: unknown) {
      toast({
        title: 'Error saving event',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editForm || !onDelete) return;

    setDeleting(true);
    try {
      await onDelete(editForm);

      toast({
        title: 'Event deleted',
        description: 'Event removed successfully',
      });

      if (currentIndex < events.length - 1) {
        onNavigate(currentIndex);
      } else if (currentIndex > 0) {
        onNavigate(currentIndex - 1);
      } else {
        onClose();
      }
    } catch (error: unknown) {
      toast({
        title: 'Error deleting event',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleNavigate = async (newIndex: number) => {
    if (hasChanges && editForm) {
      setSaving(true);
      try {
        await onSave(editForm);
        setHasChanges(false);
      } catch (error: unknown) {
        toast({
          title: 'Error saving changes',
          description: error instanceof Error ? error.message : 'Please try again',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      } finally {
        setSaving(false);
      }
    }

    onNavigate(newIndex);
  };

  const updateField = <K extends keyof Event>(field: K, value: Event[K]) => {
    if (!editForm) return;
    setEditForm({ ...editForm, [field]: value });
    setHasChanges(true);
  };

  if (!editForm) return null;

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === events.length - 1;

  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Edit Event ({currentIndex + 1} of {events.length})</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleNavigate(currentIndex - 1)}
                disabled={isFirst || saving}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleNavigate(currentIndex + 1)}
                disabled={isLast || saving}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            Update event details. Changes will be saved to the artist's calendar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Read-only Info */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
            <div>
              <Label className="text-xs text-muted-foreground">Artist</Label>
              <div className="text-sm font-medium">{editForm.artistName || '(Unknown)'}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Event ID</Label>
              <div className="text-sm font-mono text-muted-foreground truncate">{editForm.id}</div>
            </div>
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              value={editForm.title || ''}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Enter event title"
            />
          </div>

          {/* Type */}
          <div>
            <Label htmlFor="event-type">Event Type</Label>
            <Select
              value={editForm.type || 'gig'}
              onValueChange={(value) => updateField('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="event-date">Date</Label>
              <Input
                id="event-date"
                type="date"
                value={formatDateForInput(editForm.date)}
                onChange={(e) => updateField('date', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="event-end-date">End Date (optional)</Label>
              <Input
                id="event-end-date"
                type="date"
                value={editForm.endDate ? formatDateForInput(editForm.endDate) : ''}
                onChange={(e) => updateField('endDate', e.target.value || undefined)}
              />
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="event-start-time">Start Time</Label>
              <Input
                id="event-start-time"
                type="time"
                value={editForm.startTime || ''}
                onChange={(e) => updateField('startTime', e.target.value || undefined)}
              />
            </div>
            <div>
              <Label htmlFor="event-end-time">End Time</Label>
              <Input
                id="event-end-time"
                type="time"
                value={editForm.endTime || ''}
                onChange={(e) => updateField('endTime', e.target.value || undefined)}
              />
            </div>
          </div>

          {/* All Day / Public */}
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="event-all-day"
                checked={editForm.isAllDay || false}
                onChange={(e) => updateField('isAllDay', e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="event-all-day" className="text-sm cursor-pointer">
                All Day Event
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="event-public"
                checked={editForm.isPublic || false}
                onChange={(e) => updateField('isPublic', e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="event-public" className="text-sm cursor-pointer">
                Public Event
              </Label>
            </div>
          </div>

          {/* Venue */}
          <div>
            <Label htmlFor="event-venue">Venue</Label>
            <Input
              id="event-venue"
              value={editForm.venueName || ''}
              disabled
              className="bg-muted"
              placeholder="(Read-only - set via venue lookup)"
            />
            {editForm.venue?.city && (
              <p className="text-xs text-muted-foreground mt-1">{editForm.venue.city}</p>
            )}
          </div>

          {/* Location (freeform) */}
          <div>
            <Label htmlFor="event-location">Location (freeform)</Label>
            <Input
              id="event-location"
              value={editForm.location || ''}
              onChange={(e) => updateField('location', e.target.value || undefined)}
              placeholder="Enter location if no venue selected"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="event-notes">Notes</Label>
            <Textarea
              id="event-notes"
              value={editForm.notes || ''}
              onChange={(e) => updateField('notes', e.target.value || undefined)}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg text-xs">
            <div>
              <Label className="text-xs text-muted-foreground">Created</Label>
              <div>{editForm.createdAt ? new Date(editForm.createdAt).toLocaleString('en-GB') : '-'}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Updated</Label>
              <div>{editForm.updatedAt ? new Date(editForm.updatedAt).toLocaleString('en-GB') : '-'}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving || deleting}>
              Close
            </Button>
            {onDelete && editForm.artistId && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || saving}
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving || deleting || !editForm.artistId}
            variant="default"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
