import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Building, MapPin, AlertCircle } from 'lucide-react';
import VenueAutocomplete from '@/components/ui/venue-autocomplete';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { venueCRMService } from '@/lib/services/venue-crm-service';

interface AddVenueModalProps {
  open: boolean;
  onClose: () => void;
  artistId: string;
}

interface SelectedVenue {
  id: string;
  name: string;
  address: string;
  city?: string;
  postcode?: string;
}

export default function AddVenueModal({
  open,
  onClose,
  artistId,
}: AddVenueModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedVenue, setSelectedVenue] = useState<SelectedVenue | null>(null);
  const [customName, setCustomName] = useState('');
  const [notes, setNotes] = useState('');

  const addVenueMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVenue) {
        throw new Error('No venue selected');
      }

      return venueCRMService.createArtistVenue(artistId, {
        venueId: selectedVenue.id,
        notes: notes.trim() || undefined,
        customVenueName: customName.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-venues', artistId] });
      queryClient.invalidateQueries({ queryKey: ['venue-count', artistId] });

      toast({
        title: 'Venue added',
        description: `${selectedVenue?.name} has been added to your CRM`,
      });

      handleClose();
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to add venue';

      if (errorMessage.includes('409') || errorMessage.includes('already exists')) {
        toast({
          title: 'Venue already in CRM',
          description: 'This venue is already in your venue list',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error adding venue',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    },
  });

  const handleVenueSelect = (
    placeId: string,
    name: string,
    address: string,
    location?: { lat: number; lng: number },
    venue?: any
  ) => {
    // If an existing BNDY venue was selected
    if (venue) {
      setSelectedVenue({
        id: venue.id,
        name: venue.name,
        address: venue.address,
        city: venue.city,
        postcode: venue.postcode,
      });
    } else {
      // New venue from Google Places - show message that they need to contact admin
      toast({
        title: 'New venue detected',
        description: 'This venue is not in BNDY yet. Please contact support to add it first.',
        variant: 'default',
      });
      setSelectedVenue(null);
    }
  };

  const handleSave = () => {
    if (!selectedVenue) {
      toast({
        title: 'No venue selected',
        description: 'Please search and select a venue from the list',
        variant: 'destructive',
      });
      return;
    }

    addVenueMutation.mutate();
  };

  const handleClose = () => {
    if (!addVenueMutation.isPending) {
      setSelectedVenue(null);
      setCustomName('');
      setNotes('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Venue to CRM
          </DialogTitle>
          <DialogDescription>
            Search for a venue in the BNDY database to add to your CRM
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Search Venue */}
          <div>
            <Label htmlFor="venue-search" className="text-base font-semibold mb-2">
              Search Venues <span className="text-destructive">*</span>
            </Label>
            <VenueAutocomplete
              value=""
              onChange={handleVenueSelect}
              placeholder="Search for venue by name or location..."
            />
            <p className="text-xs text-muted-foreground mt-2">
              Searches the BNDY venue database
            </p>
          </div>

          {/* Selected Venue Display */}
          {selectedVenue && (
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white flex-shrink-0">
                  <Building className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">{selectedVenue.name}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3" />
                    <span>{selectedVenue.address}</span>
                    {selectedVenue.city && <span>• {selectedVenue.city}</span>}
                    {selectedVenue.postcode && <span>• {selectedVenue.postcode}</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Custom Venue Name (Optional) */}
          <div>
            <Label htmlFor="custom-name">
              Custom Venue Name (Optional)
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Give this venue a nickname for your own reference (e.g., "The Dive Bar")
            </p>
            <Input
              id="custom-name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Enter a custom name..."
              disabled={!selectedVenue}
            />
          </div>

          {/* Notes (Optional) */}
          <div>
            <Label htmlFor="notes">
              Notes (Optional)
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Add private notes about this venue (e.g., "Good sound system", "Ask for Steve")
            </p>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your notes..."
              rows={3}
              disabled={!selectedVenue}
            />
          </div>

          {/* Info Message */}
          {!selectedVenue && (
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                    Search for a venue above
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                    Start typing to search the BNDY venue database. If the venue doesn't exist, please contact support to add it.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={addVenueMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedVenue || addVenueMutation.isPending}
          >
            {addVenueMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add to CRM
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
