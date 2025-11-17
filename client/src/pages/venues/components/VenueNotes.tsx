import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, FileText, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/lib/user-context';
import { venueCRMService } from '@/lib/services/venue-crm-service';
import type { VenueNote } from '@/lib/services/venue-crm-service';
import { formatDistanceToNow } from 'date-fns';

interface VenueNotesProps {
  artistId: string;
  venueId: string;
}

export default function VenueNotes({ artistId, venueId }: VenueNotesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNote, setEditingNote] = useState<VenueNote | null>(null);
  const [noteText, setNoteText] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Fetch notes
  const { data: notes = [], isLoading } = useQuery<VenueNote[]>({
    queryKey: ['venue-notes', artistId, venueId],
    queryFn: () => venueCRMService.getVenueNotes(artistId, venueId),
  });

  // Create note mutation
  const createMutation = useMutation({
    mutationFn: (text: string) =>
      venueCRMService.createVenueNote(artistId, venueId, {
        note_text: text,
        created_by_user_id: user!.id,
        created_by_display_name: user!.displayName || user!.username || 'Unknown User',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-notes', artistId, venueId] });
      setShowAddModal(false);
      setNoteText('');
      toast({ title: 'Note added' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to add note',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update note mutation
  const updateMutation = useMutation({
    mutationFn: ({ noteId, text }: { noteId: string; text: string }) =>
      venueCRMService.updateVenueNote(artistId, venueId, noteId, {
        note_text: text,
        user_id: user!.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-notes', artistId, venueId] });
      setEditingNote(null);
      setNoteText('');
      toast({ title: 'Note updated' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update note',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete note mutation
  const deleteMutation = useMutation({
    mutationFn: (noteId: string) =>
      venueCRMService.deleteVenueNote(artistId, venueId, noteId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-notes', artistId, venueId] });
      setDeleteConfirm(null);
      toast({ title: 'Note deleted' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete note',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    createMutation.mutate(noteText.trim());
  };

  const handleEditNote = () => {
    if (!editingNote || !noteText.trim()) return;
    updateMutation.mutate({ noteId: editingNote.id, text: noteText.trim() });
  };

  const handleDeleteNote = (noteId: string) => {
    deleteMutation.mutate(noteId);
  };

  const openEditModal = (note: VenueNote) => {
    setEditingNote(note);
    setNoteText(note.note_text);
  };

  const closeModals = () => {
    setShowAddModal(false);
    setEditingNote(null);
    setNoteText('');
  };

  const canEditNote = (note: VenueNote) => {
    return user && note.created_by_user_id === user.id;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading notes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-medium">Notes</h3>
          <span className="text-sm text-muted-foreground">({notes.length})</span>
        </div>
        <Button onClick={() => setShowAddModal(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Note
        </Button>
      </div>

      {/* Notes List */}
      {notes.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No notes yet</p>
              <p className="text-sm mt-1">Add notes to keep track of important details about this venue</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id} className="relative">
              <CardContent className="pt-4 pb-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 space-y-2">
                    {/* Note metadata */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {note.created_by_display_name}
                      </span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                      </span>
                      {note.is_edited && (
                        <>
                          <span>•</span>
                          <span className="italic">edited</span>
                        </>
                      )}
                    </div>

                    {/* Note text */}
                    <p className="text-sm whitespace-pre-wrap">{note.note_text}</p>
                  </div>

                  {/* Actions (only show for note owner) */}
                  {canEditNote(note) && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(note)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(note.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Note Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              Add a note about this venue for your band to reference later
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="note-text">Note</Label>
              <Textarea
                id="note-text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Enter your note here..."
                rows={6}
                className="mt-1.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModals}>
              Cancel
            </Button>
            <Button
              onClick={handleAddNote}
              disabled={!noteText.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Adding...' : 'Add Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Note Modal */}
      <Dialog open={!!editingNote} onOpenChange={() => setEditingNote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
            <DialogDescription>
              Make changes to your note
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-note-text">Note</Label>
              <Textarea
                id="edit-note-text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Enter your note here..."
                rows={6}
                className="mt-1.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModals}>
              Cancel
            </Button>
            <Button
              onClick={handleEditNote}
              disabled={!noteText.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span>This will permanently delete your note.</span>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDeleteNote(deleteConfirm)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
