import { useState, useEffect } from 'react';
import { MapPin, RefreshCw, Edit, Trash2, Save, X, Globe, Facebook, List, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  getAllVenues,
  createVenue,
  updateVenue,
  deleteVenue,
  type Venue,
} from '@/lib/services/godmode-service';
import { useConfirm } from '@/hooks/use-confirm';
import VenueEditModal from '../components/VenueEditModal';
import VenueAddModal from '../components/VenueAddModal';

export default function VenuesPage() {
  const { confirm, ConfirmDialog } = useConfirm();

  // Venues State
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [venuesError, setVenuesError] = useState<string | null>(null);
  const [venueFilter, setVenueFilter] = useState<'all' | 'no-place-id' | 'no-socials'>('all');
  const [venueSearch, setVenueSearch] = useState('');
  const [editingVenue, setEditingVenue] = useState<string | null>(null);
  const [venueEditForm, setVenueEditForm] = useState<Venue | null>(null);
  const [deletingVenue, setDeletingVenue] = useState<string | null>(null);
  const [venuePage, setVenuePage] = useState(1);
  const venuesPerPage = 25;

  // Batch Edit Modal State
  const [venueEditModalOpen, setVenueEditModalOpen] = useState(false);
  const [venueEditIndex, setVenueEditIndex] = useState(0);

  // Add Venue Modal State
  const [venueAddModalOpen, setVenueAddModalOpen] = useState(false);

  // Fetch Venues
  const fetchVenues = async () => {
    setVenuesLoading(true);
    setVenuesError(null);
    try {
      const data = await getAllVenues();
      setVenues(data);
    } catch (err) {
      setVenuesError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setVenuesLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  // Reset page when search changes
  useEffect(() => {
    setVenuePage(1);
  }, [venueSearch, venueFilter]);

  // Venue Handlers
  const handleVenueEditStart = (venue: Venue) => {
    setEditingVenue(venue.id);
    setVenueEditForm({ ...venue });
  };

  const handleVenueEditSave = async () => {
    if (!venueEditForm) return;
    try {
      const updated = await updateVenue(venueEditForm.id, venueEditForm);
      setVenues(venues.map(v => v.id === updated.id ? updated : v));
      setEditingVenue(null);
      setVenueEditForm(null);
    } catch (err) {
      setVenuesError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleVenueDelete = async (venueId: string) => {
    const confirmed = await confirm({
      title: 'Delete Venue',
      description: 'Are you sure you want to delete this venue? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setDeletingVenue(venueId);
    try {
      await deleteVenue(venueId);
      setVenues(venues.filter(v => v.id !== venueId));
    } catch (err) {
      setVenuesError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingVenue(null);
    }
  };

  // Batch Edit Modal Handlers
  const handleOpenVenueBatchEdit = () => {
    if (filteredVenues.length === 0) return;
    setVenueEditIndex(0);
    setVenueEditModalOpen(true);
  };

  const handleVenueBatchSave = async (venue: Venue) => {
    const updated = await updateVenue(venue.id, venue);
    setVenues(venues.map(v => v.id === updated.id ? updated : v));
  };

  // Add Venue Handler
  const handleVenueCreate = async (venueData: any) => {
    const newVenue = await createVenue(venueData);
    setVenues([...venues, newVenue]);
  };

  // Filtered Data
  const filteredVenues = venues.filter(v => {
    const matchesSearch = (v.name && String(v.name).toLowerCase().includes(venueSearch.toLowerCase())) ||
                         (v.address && String(v.address).toLowerCase().includes(venueSearch.toLowerCase())) ||
                         (v.postcode && String(v.postcode).toLowerCase().includes(venueSearch.toLowerCase()));
    if (!matchesSearch) return false;
    if (venueFilter === 'no-place-id') return !v.googlePlaceId;
    if (venueFilter === 'no-socials') {
      const hasSocials = v.website ||
                        ((v as any).social_media_urls && Array.isArray((v as any).social_media_urls) &&
                         (v as any).social_media_urls.length > 0);
      return !hasSocials;
    }
    return true;
  });

  // Pagination
  const venueTotalPages = Math.ceil(filteredVenues.length / venuesPerPage);
  const venueStartIndex = (venuePage - 1) * venuesPerPage;
  const paginatedVenues = filteredVenues.slice(venueStartIndex, venueStartIndex + venuesPerPage);

  // Stats
  const venueStats = {
    total: venues.length,
    noPlaceId: venues.filter(v => !v.googlePlaceId).length,
    noSocials: venues.filter(v => {
      const hasSocials = v.website ||
                        ((v as any).social_media_urls && Array.isArray((v as any).social_media_urls) &&
                         (v as any).social_media_urls.length > 0);
      return !hasSocials;
    }).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MapPin className="h-8 w-8" />
            Venues
          </h1>
          <p className="text-muted-foreground mt-1">Manage venues across the platform</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Input
            placeholder="Search venues by name, address, or postcode..."
            value={venueSearch}
            onChange={(e) => setVenueSearch(e.target.value)}
            className="max-w-md"
          />
          <div className="flex gap-2">
            <Button onClick={() => setVenueAddModalOpen(true)} size="sm" variant="default">
              <Plus className="h-4 w-4 mr-2" />
              Add Venue
            </Button>
            <Button onClick={fetchVenues} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={venueFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setVenueFilter('all')}
              size="sm"
            >
              All ({venueStats.total})
            </Button>
            <Button
              variant={venueFilter === 'no-place-id' ? 'default' : 'outline'}
              onClick={() => setVenueFilter('no-place-id')}
              size="sm"
            >
              No Place ID ({venueStats.noPlaceId})
            </Button>
            <Button
              variant={venueFilter === 'no-socials' ? 'default' : 'outline'}
              onClick={() => setVenueFilter('no-socials')}
              size="sm"
            >
              No Socials ({venueStats.noSocials})
            </Button>
          </div>
          {filteredVenues.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenVenueBatchEdit}
            >
              <List className="h-4 w-4 mr-2" />
              Batch Edit ({filteredVenues.length})
            </Button>
          )}
        </div>
      </div>

      {venuesLoading && <div className="text-center py-12"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div>}
      {venuesError && <div className="text-destructive text-center py-12">{venuesError}</div>}

      {!venuesLoading && !venuesError && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Address</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Links</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Coordinates</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedVenues.map(venue => (
                  <tr key={venue.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      {venue.validated ?
                        <CheckCircle className="h-5 w-5 text-green-500" /> :
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      }
                    </td>
                    <td className="px-4 py-3">
                      {editingVenue === venue.id ? (
                        <Input
                          value={venueEditForm?.name || ''}
                          onChange={(e) => setVenueEditForm(prev => prev ? {...prev, name: e.target.value} : null)}
                          className="h-8"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{venue.name}</span>
                          {venue.name && venues.filter(v => v.name && String(v.name).toLowerCase() === String(venue.name).toLowerCase()).length > 1 && (
                            <AlertCircle className="h-4 w-4 text-orange-500" title="Duplicate name detected" />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingVenue === venue.id ? (
                        <Input
                          value={venueEditForm?.address || ''}
                          onChange={(e) => setVenueEditForm(prev => prev ? {...prev, address: e.target.value} : null)}
                          className="h-8"
                        />
                      ) : (
                        <div className="text-sm max-w-xs truncate">{venue.address}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {venue.website && (
                          <a
                            href={venue.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                            title={venue.website}
                          >
                            <Globe className="h-4 w-4" />
                          </a>
                        )}
                        {(() => {
                          const socialUrls = venue.socialMediaUrls || [];
                          const facebookUrl = socialUrls.find((s: any) => {
                            if (typeof s === 'string') return s.includes('facebook.com');
                            return s?.platform === 'facebook';
                          });
                          const url = typeof facebookUrl === 'string' ? facebookUrl : facebookUrl?.url;
                          return url && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                              title="Facebook"
                            >
                              <Facebook className="h-4 w-4" />
                            </a>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-muted-foreground">
                        {venue.location && typeof venue.location.lat === 'number' && typeof venue.location.lng === 'number' ? (
                          <>
                            <div>{venue.location.lat.toFixed(6)}</div>
                            <div>{venue.location.lng.toFixed(6)}</div>
                          </>
                        ) : venue.latitude && venue.longitude ? (
                          <>
                            <div>{venue.latitude.toFixed(6)}</div>
                            <div>{venue.longitude.toFixed(6)}</div>
                          </>
                        ) : (
                          <span className="italic">No coords</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {editingVenue === venue.id ? (
                          <>
                            <Button size="sm" variant="default" onClick={handleVenueEditSave}>
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingVenue(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleVenueEditStart(venue)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleVenueDelete(venue.id)}
                              disabled={deletingVenue === venue.id}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Venues Pagination */}
          {venueTotalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {venueStartIndex + 1}-{Math.min(venueStartIndex + venuesPerPage, filteredVenues.length)} of {filteredVenues.length} venues
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVenuePage(p => Math.max(1, p - 1))}
                  disabled={venuePage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-2 px-3">
                  <span className="text-sm">Page {venuePage} of {venueTotalPages}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVenuePage(p => Math.min(venueTotalPages, p + 1))}
                  disabled={venuePage === venueTotalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog />

      {/* Batch Edit Modal */}
      {venueEditModalOpen && filteredVenues.length > 0 && (
        <VenueEditModal
          open={venueEditModalOpen}
          onClose={() => setVenueEditModalOpen(false)}
          venues={filteredVenues}
          currentIndex={venueEditIndex}
          onSave={handleVenueBatchSave}
          onNavigate={setVenueEditIndex}
        />
      )}

      {/* Add Venue Modal */}
      <VenueAddModal
        open={venueAddModalOpen}
        onClose={() => setVenueAddModalOpen(false)}
        onSave={handleVenueCreate}
      />
    </div>
  );
}
