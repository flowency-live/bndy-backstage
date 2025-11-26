import { useState, useEffect } from 'react';
import { User, RefreshCw, Edit, Trash2, Globe, List, CheckCircle, Lock, LockOpen, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  getAllArtists,
  getAllUsers,
  getAllMemberships,
  updateArtist,
  deleteArtist,
  markArtistAsReviewed,
  type Artist,
  type User as UserType,
  type Membership
} from '@/lib/services/godmode-service';
import { useConfirm } from '@/hooks/use-confirm';
import { useToast } from '@/hooks/use-toast';
import ArtistEditModal from '../components/ArtistEditModal';

export default function ArtistsPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const { toast } = useToast();

  // Artists State
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(false);
  const [artistsError, setArtistsError] = useState<string | null>(null);
  const [artistFilter, setArtistFilter] = useState<'all' | 'validated' | 'unvalidated' | 'no-genres' | 'no-socials' | 'no-location' | 'needs-review' | 'frontstage' | 'backstage'>('all');
  const [artistSearch, setArtistSearch] = useState('');
  const [artistTypeFilter, setArtistTypeFilter] = useState<string>('');
  const [acousticFilter, setAcousticFilter] = useState<string>('all');
  const [actTypeFilter, setActTypeFilter] = useState<string>('');
  const [deletingArtist, setDeletingArtist] = useState<string | null>(null);
  const [reviewingArtist, setReviewingArtist] = useState<string | null>(null);
  const [artistPage, setArtistPage] = useState(1);
  const artistsPerPage = 25;

  // Users & Memberships State
  const [users, setUsers] = useState<UserType[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [membershipsLoading, setMembershipsLoading] = useState(false);

  // Batch Edit Modal State
  const [artistEditModalOpen, setArtistEditModalOpen] = useState(false);
  const [artistEditIndex, setArtistEditIndex] = useState(0);

  // Fetch Functions
  const fetchArtists = async () => {
    setArtistsLoading(true);
    setArtistsError(null);
    try {
      const data = await getAllArtists();
      setArtists(data);
    } catch (err) {
      setArtistsError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setArtistsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchMemberships = async () => {
    setMembershipsLoading(true);
    try {
      const data = await getAllMemberships();
      setMemberships(data);
    } catch (err) {
      console.error('Error fetching memberships:', err);
    } finally {
      setMembershipsLoading(false);
    }
  };

  useEffect(() => {
    fetchArtists();
    fetchUsers();
    fetchMemberships();
  }, []);

  // Reset page when search or filters change
  useEffect(() => {
    setArtistPage(1);
  }, [artistSearch, artistFilter, artistTypeFilter, acousticFilter, actTypeFilter]);

  // Artist Handlers
  const handleArtistEditStart = (artist: Artist) => {
    // Find the index of this artist in the artists array
    const artistIndex = artists.findIndex(a => a.id === artist.id);
    if (artistIndex >= 0) {
      setArtistEditIndex(artistIndex);
      setArtistEditModalOpen(true);
    }
  };

  const handleArtistDelete = async (artistId: string) => {
    const confirmed = await confirm({
      title: 'Delete Artist',
      description: 'Are you sure you want to delete this artist? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setDeletingArtist(artistId);
    try {
      await deleteArtist(artistId);
      setArtists(artists.filter(a => a.id !== artistId));
    } catch (err) {
      setArtistsError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingArtist(null);
    }
  };

  const handleMarkAsReviewed = async (artistId: string) => {
    setReviewingArtist(artistId);
    try {
      const updated = await markArtistAsReviewed(artistId);
      setArtists(artists.map(a => a.id === updated.id ? updated : a));
    } catch (err) {
      setArtistsError(err instanceof Error ? err.message : 'Failed to mark as reviewed');
    } finally {
      setReviewingArtist(null);
    }
  };

  const handleToggleBackstage = async (artist: Artist) => {
    const newSource = artist.source === 'backstage' ? 'community' : 'backstage';
    const actionText = newSource === 'backstage' ? 'enable in Backstage' : 'revert to Community';

    const confirmed = await confirm({
      title: `${newSource === 'backstage' ? 'Enable' : 'Disable'} Backstage Access`,
      description: `Are you sure you want to ${actionText} for "${artist.name}"? ${newSource === 'backstage' ? 'This will allow artist owners to manage their profile and create gigs.' : 'This will remove Backstage access.'}`,
      confirmText: newSource === 'backstage' ? 'Enable Backstage' : 'Revert to Community',
    });

    if (!confirmed) return;

    try {
      const updated = await updateArtist(artist.id, { source: newSource });
      setArtists(artists.map(a => a.id === updated.id ? updated : a));
      toast({
        title: "Success",
        description: `Artist ${newSource === 'backstage' ? 'enabled in Backstage' : 'reverted to Community'}.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to update artist',
        variant: "destructive",
      });
    }
  };

  const handleGenerateInvite = async (artist: Artist) => {
    // TODO: Implement invite generation endpoint
    toast({
      title: "Coming Soon",
      description: "Invite generation will be implemented next.",
    });
  };

  // Batch Edit Modal Handlers
  const handleOpenArtistBatchEdit = () => {
    if (filteredArtists.length === 0) return;
    setArtistEditIndex(0);
    setArtistEditModalOpen(true);
  };

  const handleArtistBatchSave = async (artist: Artist) => {
    const updated = await updateArtist(artist.id, artist);
    setArtists(artists.map(a => a.id === updated.id ? updated : a));
  };

  // Filtered Data
  const filteredArtists = artists.filter(a => {
    const matchesSearch = (a.name && String(a.name).toLowerCase().includes(artistSearch.toLowerCase())) ||
                         (a.location && String(a.location).toLowerCase().includes(artistSearch.toLowerCase()));
    if (!matchesSearch) return false;

    // Apply category filter
    if (artistFilter === 'validated') {
      if (a.validated !== true) return false;
    }
    if (artistFilter === 'unvalidated') {
      if (a.validated === true) return false;
    }
    if (artistFilter === 'no-genres') {
      if (a.genres && Array.isArray(a.genres) && a.genres.length > 0) return false;
    }
    if (artistFilter === 'no-socials') {
      const hasSocials = a.facebookUrl || a.instagramUrl;
      if (hasSocials) return false;
    }
    if (artistFilter === 'no-location') {
      if (a.location) return false;
    }
    if (artistFilter === 'needs-review') {
      if (a.needs_review !== true) return false;
    }
    if (artistFilter === 'frontstage') {
      if (a.source !== 'frontstage') return false;
    }
    if (artistFilter === 'backstage') {
      if (a.source !== 'backstage') return false;
    }

    // Apply artist type filter
    if (artistTypeFilter && a.artistType !== artistTypeFilter) return false;

    // Apply acoustic filter
    if (acousticFilter === 'acoustic' && a.acoustic !== true) return false;
    if (acousticFilter === 'non-acoustic' && a.acoustic === true) return false;

    // Apply act type filter
    if (actTypeFilter && (!a.actType || !a.actType.includes(actTypeFilter))) return false;

    return true;
  });

  // Pagination
  const artistTotalPages = Math.ceil(filteredArtists.length / artistsPerPage);
  const artistStartIndex = (artistPage - 1) * artistsPerPage;
  const paginatedArtists = filteredArtists.slice(artistStartIndex, artistStartIndex + artistsPerPage);

  // Stats
  const artistStats = {
    total: artists.length,
    validated: artists.filter(a => a.validated === true).length,
    unvalidated: artists.filter(a => a.validated !== true).length,
    noGenres: artists.filter(a => !a.genres || (Array.isArray(a.genres) && a.genres.length === 0)).length,
    noSocials: artists.filter(a => !a.facebookUrl && !a.instagramUrl).length,
    noLocation: artists.filter(a => !a.location).length,
    needsReview: artists.filter(a => a.needs_review === true).length,
    frontstage: artists.filter(a => a.source === 'frontstage').length,
    backstage: artists.filter(a => a.source === 'backstage').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <User className="h-8 w-8" />
            Artists
          </h1>
          <p className="text-muted-foreground mt-1">Manage artists across the platform</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center gap-4">
          <Input
            placeholder="Search artists by name or location..."
            value={artistSearch}
            onChange={(e) => setArtistSearch(e.target.value)}
            className="max-w-md"
          />
          <Button onClick={fetchArtists} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* New Filters Row */}
        <div className="flex gap-2 flex-wrap">
          <select
            value={artistTypeFilter}
            onChange={(e) => setArtistTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm border rounded-md bg-background"
          >
            <option value="">All Artist Types</option>
            <option value="band">Band</option>
            <option value="solo">Solo Act</option>
            <option value="duo">Duo</option>
            <option value="group">Group</option>
            <option value="dj">DJ</option>
            <option value="collective">Collective</option>
          </select>

          <select
            value={acousticFilter}
            onChange={(e) => setAcousticFilter(e.target.value)}
            className="px-3 py-2 text-sm border rounded-md bg-background"
          >
            <option value="all">All Acts</option>
            <option value="acoustic">Acoustic Only</option>
            <option value="non-acoustic">Non-Acoustic</option>
          </select>

          <select
            value={actTypeFilter}
            onChange={(e) => setActTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm border rounded-md bg-background"
          >
            <option value="">All Act Types</option>
            <option value="originals">Originals</option>
            <option value="covers">Covers</option>
            <option value="tribute">Tribute</option>
          </select>

          {(artistTypeFilter || acousticFilter !== 'all' || actTypeFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setArtistTypeFilter('');
                setAcousticFilter('all');
                setActTypeFilter('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={artistFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setArtistFilter('all')}
              size="sm"
            >
              All ({artistStats.total})
            </Button>
            <Button
              variant={artistFilter === 'validated' ? 'default' : 'outline'}
              onClick={() => setArtistFilter('validated')}
              size="sm"
            >
              Validated ({artistStats.validated})
            </Button>
            <Button
              variant={artistFilter === 'unvalidated' ? 'default' : 'outline'}
              onClick={() => setArtistFilter('unvalidated')}
              size="sm"
            >
              Unvalidated ({artistStats.unvalidated})
            </Button>
            <Button
              variant={artistFilter === 'no-genres' ? 'default' : 'outline'}
              onClick={() => setArtistFilter('no-genres')}
              size="sm"
            >
              No Genres ({artistStats.noGenres})
            </Button>
            <Button
              variant={artistFilter === 'no-socials' ? 'default' : 'outline'}
              onClick={() => setArtistFilter('no-socials')}
              size="sm"
            >
              No Socials ({artistStats.noSocials})
            </Button>
            <Button
              variant={artistFilter === 'no-location' ? 'default' : 'outline'}
              onClick={() => setArtistFilter('no-location')}
              size="sm"
            >
              No Location / Place ID ({artistStats.noLocation})
            </Button>
            <Button
              variant={artistFilter === 'needs-review' ? 'default' : 'outline'}
              onClick={() => setArtistFilter('needs-review')}
              size="sm"
            >
              Needs Review ({artistStats.needsReview})
            </Button>
            <Button
              variant={artistFilter === 'frontstage' ? 'default' : 'outline'}
              onClick={() => setArtistFilter('frontstage')}
              size="sm"
            >
              Frontstage ({artistStats.frontstage})
            </Button>
            <Button
              variant={artistFilter === 'backstage' ? 'default' : 'outline'}
              onClick={() => setArtistFilter('backstage')}
              size="sm"
            >
              Backstage ({artistStats.backstage})
            </Button>
          </div>
          {filteredArtists.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenArtistBatchEdit}
            >
              <List className="h-4 w-4 mr-2" />
              Batch Edit ({filteredArtists.length})
            </Button>
          )}
        </div>
      </div>

      {artistsLoading && <div className="text-center py-12"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div>}
      {artistsError && <div className="text-destructive text-center py-12">{artistsError}</div>}

      {!artistsLoading && !artistsError && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Genres</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Events</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Links</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Owner</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedArtists.map(artist => (
                  <tr key={artist.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{artist.name}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{artist.location}</td>
                    <td className="px-4 py-3 text-sm">{Array.isArray(artist.genres) ? artist.genres.slice(0, 2).join(', ') : (artist.genres || '-')}</td>
                    <td className="px-4 py-3 text-sm">{artist.eventCount || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {artist.websiteUrl && (
                          <a
                            href={artist.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                            title={artist.websiteUrl}
                          >
                            <Globe className="h-4 w-4" />
                          </a>
                        )}
                        {artist.facebookUrl && (
                          <a
                            href={artist.facebookUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                            title="Facebook"
                          >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const ownerMembership = memberships.find(
                          m => m.artist_id === artist.id && m.role === 'owner'
                        );

                        if (ownerMembership) {
                          const ownerUser = users.find(u => u.cognitoId === ownerMembership.user_id);

                          if (ownerUser) {
                            return (
                              <div className="text-sm font-medium">
                                {ownerUser.displayName || ownerUser.username}
                              </div>
                            );
                          }

                          return <span className="text-yellow-600 text-sm">Owner (user not found)</span>;
                        }

                        return <span className="text-muted-foreground italic text-sm">No owner</span>;
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {artist.isVerified && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {artist.claimedByUserId && <User className="h-4 w-4 text-blue-500" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {artist.needs_review && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleMarkAsReviewed(artist.id)}
                            disabled={reviewingArtist === artist.id}
                            title="Mark as reviewed"
                          >
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                        )}
                        {(artist.source === 'community' || artist.source === 'backstage') && (
                          <Button
                            size="sm"
                            variant={artist.source === 'backstage' ? 'secondary' : 'default'}
                            onClick={() => handleToggleBackstage(artist)}
                            title={artist.source === 'backstage' ? 'Disable Backstage access' : 'Enable in Backstage'}
                          >
                            {artist.source === 'backstage' ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
                          </Button>
                        )}
                        {artist.source === 'backstage' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateInvite(artist)}
                            title="Generate invite link"
                          >
                            <UserPlus className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleArtistEditStart(artist)}
                          title="Edit artist details"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleArtistDelete(artist.id)}
                          disabled={deletingArtist === artist.id}
                          title="Delete artist"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Artists Pagination */}
          {artistTotalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {artistStartIndex + 1}-{Math.min(artistStartIndex + artistsPerPage, filteredArtists.length)} of {filteredArtists.length} artists
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setArtistPage(p => Math.max(1, p - 1))}
                  disabled={artistPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-2 px-3">
                  <span className="text-sm">Page {artistPage} of {artistTotalPages}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setArtistPage(p => Math.min(artistTotalPages, p + 1))}
                  disabled={artistPage === artistTotalPages}
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

      {/* Edit Modal */}
      {artistEditModalOpen && artists.length > 0 && (
        <ArtistEditModal
          open={artistEditModalOpen}
          onClose={() => setArtistEditModalOpen(false)}
          artists={artists}
          currentIndex={artistEditIndex}
          onSave={handleArtistBatchSave}
          onNavigate={setArtistEditIndex}
          onDelete={handleArtistDelete}
        />
      )}
    </div>
  );
}
