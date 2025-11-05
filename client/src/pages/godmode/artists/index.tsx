import { useState, useEffect } from 'react';
import { User, RefreshCw, Edit, Trash2, Globe, List, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  getAllArtists,
  getAllUsers,
  getAllMemberships,
  updateArtist,
  deleteArtist,
  type Artist,
  type User as UserType,
  type Membership
} from '@/lib/services/godmode-service';
import { useConfirm } from '@/hooks/use-confirm';
import ArtistEditModal from '../components/ArtistEditModal';

export default function ArtistsPage() {
  const { confirm, ConfirmDialog } = useConfirm();

  // Artists State
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(false);
  const [artistsError, setArtistsError] = useState<string | null>(null);
  const [artistFilter, setArtistFilter] = useState<'all' | 'no-genres' | 'no-socials' | 'no-location'>('all');
  const [artistSearch, setArtistSearch] = useState('');
  const [deletingArtist, setDeletingArtist] = useState<string | null>(null);
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

  // Reset page when search changes
  useEffect(() => {
    setArtistPage(1);
  }, [artistSearch, artistFilter]);

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
    if (artistFilter === 'no-genres') return !a.genres || (Array.isArray(a.genres) && a.genres.length === 0);
    if (artistFilter === 'no-socials') {
      const hasSocials = a.facebookUrl || a.instagramUrl;
      return !hasSocials;
    }
    if (artistFilter === 'no-location') return !a.location;
    return true;
  });

  // Pagination
  const artistTotalPages = Math.ceil(filteredArtists.length / artistsPerPage);
  const artistStartIndex = (artistPage - 1) * artistsPerPage;
  const paginatedArtists = filteredArtists.slice(artistStartIndex, artistStartIndex + artistsPerPage);

  // Stats
  const artistStats = {
    total: artists.length,
    noGenres: artists.filter(a => !a.genres || (Array.isArray(a.genres) && a.genres.length === 0)).length,
    noSocials: artists.filter(a => !a.facebookUrl && !a.instagramUrl).length,
    noLocation: artists.filter(a => !a.location).length,
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
        <div className="flex justify-between items-center">
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
                      <div className="flex gap-1">
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
        />
      )}
    </div>
  );
}
