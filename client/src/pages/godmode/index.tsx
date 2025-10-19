import { useState, useEffect } from 'react';
import { MapPin, Music, User, CheckCircle, AlertCircle, RefreshCw, Edit, Trash2, Save, X, ExternalLink, Search, Globe, Facebook, Instagram, Link as LinkIcon } from 'lucide-react';
import LocationAutocomplete from '@/components/ui/location-autocomplete';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  getAllVenues,
  getAllArtists,
  getAllSongs,
  getAllUsers,
  getAllMemberships,
  updateVenue,
  updateArtist,
  updateSong,
  deleteVenue,
  deleteArtist,
  deleteSong,
  deleteUser,
  getEventQueue,
  approveQueueItem,
  rejectQueueItem,
  loadPOCResults,
  extractFromGigsNews,
  extractFromHTML,
  formatDuration,
  type Venue,
  type Artist,
  type Song,
  type User,
  type Membership,
  type QueueItem
} from '@/lib/services/godmode-service';
import { useConfirm } from '@/hooks/use-confirm';

export default function GodmodePage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [activeTab, setActiveTab] = useState('venues');

  // Venues State
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [venuesError, setVenuesError] = useState<string | null>(null);
  const [venueFilter, setVenueFilter] = useState<'all' | 'validated' | 'unvalidated' | 'has-coords' | 'has-images'>('all');
  const [venueSearch, setVenueSearch] = useState('');
  const [editingVenue, setEditingVenue] = useState<string | null>(null);
  const [venueEditForm, setVenueEditForm] = useState<Venue | null>(null);
  const [deletingVenue, setDeletingVenue] = useState<string | null>(null);
  const [venuePage, setVenuePage] = useState(1);
  const venuesPerPage = 25;

  // Artists State
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(false);
  const [artistsError, setArtistsError] = useState<string | null>(null);
  const [artistFilter, setArtistFilter] = useState<'all' | 'has-owner'>('all');
  const [artistSearch, setArtistSearch] = useState('');
  const [editingArtist, setEditingArtist] = useState<string | null>(null);
  const [artistEditForm, setArtistEditForm] = useState<Artist | null>(null);
  const [deletingArtist, setDeletingArtist] = useState<string | null>(null);
  const [artistPage, setArtistPage] = useState(1);
  const artistsPerPage = 25;

  // Songs State
  const [songs, setSongs] = useState<Song[]>([]);
  const [songsLoading, setSongsLoading] = useState(false);
  const [songsError, setSongsError] = useState<string | null>(null);
  const [songFilter, setSongFilter] = useState<'all' | 'featured' | 'has-streaming' | 'has-audio' | 'has-genre'>('all');
  const [songSearch, setSongSearch] = useState('');
  const [editingSong, setEditingSong] = useState<string | null>(null);
  const [songEditForm, setSongEditForm] = useState<Song | null>(null);
  const [deletingSong, setDeletingSong] = useState<string | null>(null);
  const [songPage, setSongPage] = useState(1);
  const songsPerPage = 25;

  // Users State
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<'all' | 'completed' | 'incomplete' | 'with-bands' | 'no-bands'>('all');
  const [userSearch, setUserSearch] = useState('');
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [userPage, setUserPage] = useState(1);
  const usersPerPage = 25;

  // Memberships State (for artist owner lookup)
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [membershipsLoading, setMembershipsLoading] = useState(false);

  // Event Queue State
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [processingQueue, setProcessingQueue] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<'all' | 'pending' | 'needs-review'>('pending');
  const [htmlInput, setHtmlInput] = useState('');
  const [showHtmlInput, setShowHtmlInput] = useState(false);
  const [queuePhase, setQueuePhase] = useState<'venues' | 'artists' | 'events'>('venues');
  const [editingArtistGroup, setEditingArtistGroup] = useState<string | null>(null);
  const [artistEditData, setArtistEditData] = useState<{location: string; facebookUrl: string; instagramUrl: string; websiteUrl: string}>({
    location: '',
    facebookUrl: '',
    instagramUrl: '',
    websiteUrl: ''
  });

  // Fetch Functions
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

  const fetchSongs = async () => {
    setSongsLoading(true);
    setSongsError(null);
    try {
      const data = await getAllSongs();
      setSongs(data);
    } catch (err) {
      setSongsError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSongsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Unknown error');
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

  const fetchEventQueue = async () => {
    setQueueLoading(true);
    setQueueError(null);
    try {
      const data = await getEventQueue();
      setQueueItems(data);
    } catch (err) {
      setQueueError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setQueueLoading(false);
    }
  };

  const handleLoadPOCResults = async () => {
    const confirmed = await confirm({
      title: 'Load POC Results',
      description: 'This will load the POC results from poc-results.json into the review queue. Continue?',
      confirmText: 'Load',
      variant: 'default',
    });
    if (!confirmed) return;

    setQueueLoading(true);
    try {
      await loadPOCResults();
      await fetchEventQueue();
    } catch (err) {
      setQueueError(err instanceof Error ? err.message : 'Failed to load POC results');
    } finally {
      setQueueLoading(false);
    }
  };

  const handleExtractFromGigsNews = async () => {
    const confirmed = await confirm({
      title: 'Extract Events from gigs-news.uk',
      description: 'This will fetch the latest HTML from gigs-news.uk, extract events with LLM, resolve venues/artists, and populate the review queue. This may take 2-3 minutes. Continue?',
      confirmText: 'Extract',
      variant: 'default',
    });
    if (!confirmed) return;

    setQueueLoading(true);
    setQueueError(null);
    try {
      const result = await extractFromGigsNews();
      await fetchEventQueue();
      // Show success message with count
      console.log(`Extracted ${result.extracted} events, ${result.queued} added to queue`);
    } catch (err) {
      setQueueError(err instanceof Error ? err.message : 'Failed to extract events from gigs-news');
    } finally {
      setQueueLoading(false);
    }
  };

  const handleExtractFromHTML = async () => {
    if (!htmlInput.trim()) {
      setQueueError('Please paste HTML content first');
      return;
    }

    const confirmed = await confirm({
      title: 'Extract Events from HTML',
      description: `This will extract events from the pasted HTML (${Math.round(htmlInput.length / 1024)}KB), resolve venues/artists, and populate the review queue. This takes ~60 seconds. Continue?`,
      confirmText: 'Extract',
      variant: 'default',
    });
    if (!confirmed) return;

    setQueueLoading(true);
    setQueueError(null);
    try {
      await extractFromHTML(htmlInput);
      // Success - reload queue
      await fetchEventQueue();
      setHtmlInput('');
      setShowHtmlInput(false);
    } catch (err) {
      // API Gateway timeout (503) is expected - Lambda continues processing
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('503')) {
        console.log('API Gateway timeout (expected) - reloading queue in 10s...');
        // Wait 10 seconds for Lambda to finish, then reload
        setTimeout(async () => {
          await fetchEventQueue();
          setHtmlInput('');
          setShowHtmlInput(false);
          setQueueLoading(false);
        }, 10000);
        return; // Don't set error or clear loading yet
      }
      // Real error
      setQueueError(errorMessage);
      setQueueLoading(false);
    }
  };

  const handleApproveQueueItem = async (queueId: string) => {
    setProcessingQueue(queueId);
    try {
      await approveQueueItem(queueId);
      setQueueItems(queueItems.filter(item => item.queue_id !== queueId));
    } catch (err) {
      setQueueError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setProcessingQueue(null);
    }
  };

  const handleRejectQueueItem = async (queueId: string) => {
    setProcessingQueue(queueId);
    try {
      await rejectQueueItem(queueId);
      setQueueItems(queueItems.filter(item => item.queue_id !== queueId));
    } catch (err) {
      setQueueError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setProcessingQueue(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'venues' && venues.length === 0) fetchVenues();
    if (activeTab === 'artists') {
      if (artists.length === 0) fetchArtists();
      if (memberships.length === 0) fetchMemberships();
      if (users.length === 0) fetchUsers();
    }
    if (activeTab === 'songs' && songs.length === 0) fetchSongs();
    if (activeTab === 'users' && users.length === 0) fetchUsers();
    if (activeTab === 'queue' && queueItems.length === 0) fetchEventQueue();
  }, [activeTab]);

  // Reset pages when search changes
  useEffect(() => {
    setVenuePage(1);
  }, [venueSearch, venueFilter]);

  useEffect(() => {
    setArtistPage(1);
  }, [artistSearch, artistFilter]);

  useEffect(() => {
    setSongPage(1);
  }, [songSearch, songFilter]);

  useEffect(() => {
    setUserPage(1);
  }, [userSearch, userFilter]);

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

  // Artist Handlers
  const handleArtistEditStart = (artist: Artist) => {
    setEditingArtist(artist.id);
    setArtistEditForm({ ...artist });
  };

  const handleArtistEditSave = async () => {
    if (!artistEditForm) return;
    try {
      const updated = await updateArtist(artistEditForm.id, artistEditForm);
      setArtists(artists.map(a => a.id === updated.id ? updated : a));
      setEditingArtist(null);
      setArtistEditForm(null);
    } catch (err) {
      setArtistsError(err instanceof Error ? err.message : 'Failed to save');
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

  // Song Handlers
  const handleSongEditStart = (song: Song) => {
    setEditingSong(song.id);
    setSongEditForm({ ...song });
  };

  const handleSongEditSave = async () => {
    if (!songEditForm) return;
    try {
      const updated = await updateSong(songEditForm.id, songEditForm);
      setSongs(songs.map(s => s.id === updated.id ? updated : s));
      setEditingSong(null);
      setSongEditForm(null);
    } catch (err) {
      setSongsError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleSongDelete = async (songId: string) => {
    const confirmed = await confirm({
      title: 'Delete Song',
      description: 'Are you sure you want to delete this song? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setDeletingSong(songId);
    try {
      await deleteSong(songId);
      setSongs(songs.filter(s => s.id !== songId));
    } catch (err) {
      setSongsError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingSong(null);
    }
  };

  // User Handlers
  const handleUserDelete = async (userId: string) => {
    const confirmed = await confirm({
      title: 'Delete User',
      description: 'Delete this user? This will also delete all artist memberships for this user.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setDeletingUser(userId);
    try {
      await deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingUser(null);
    }
  };

  // Filtered Data
  const filteredVenues = venues.filter(v => {
    const matchesSearch = (v.name && String(v.name).toLowerCase().includes(venueSearch.toLowerCase())) ||
                         (v.address && String(v.address).toLowerCase().includes(venueSearch.toLowerCase())) ||
                         (v.postcode && String(v.postcode).toLowerCase().includes(venueSearch.toLowerCase()));
    if (!matchesSearch) return false;
    if (venueFilter === 'validated') return v.validated;
    if (venueFilter === 'unvalidated') return !v.validated;
    if (venueFilter === 'has-coords') return v.latitude !== 0 && v.longitude !== 0;
    if (venueFilter === 'has-images') return v.profileImageUrl !== null;
    return true;
  });

  const filteredArtists = artists.filter(a => {
    const matchesSearch = (a.name && String(a.name).toLowerCase().includes(artistSearch.toLowerCase())) ||
                         (a.location && String(a.location).toLowerCase().includes(artistSearch.toLowerCase()));
    if (!matchesSearch) return false;
    if (artistFilter === 'has-owner') {
      return memberships.some(m => m.artist_id === a.id && m.role === 'owner');
    }
    return true;
  });

  const filteredSongs = songs.filter(s => {
    const matchesSearch = (s.title && String(s.title).toLowerCase().includes(songSearch.toLowerCase())) ||
                         (s.artistName && String(s.artistName).toLowerCase().includes(songSearch.toLowerCase())) ||
                         (s.genre && String(s.genre).toLowerCase().includes(songSearch.toLowerCase())) ||
                         (s.album && String(s.album).toLowerCase().includes(songSearch.toLowerCase()));
    if (!matchesSearch) return false;
    if (songFilter === 'featured') return s.isFeatured;
    if (songFilter === 'has-streaming') return !!(s.spotifyUrl || s.appleMusicUrl || s.youtubeUrl);
    if (songFilter === 'has-audio') return !!s.audioFileUrl;
    if (songFilter === 'has-genre') return !!s.genre;
    return true;
  });

  // Pagination
  const venueTotalPages = Math.ceil(filteredVenues.length / venuesPerPage);
  const venueStartIndex = (venuePage - 1) * venuesPerPage;
  const paginatedVenues = filteredVenues.slice(venueStartIndex, venueStartIndex + venuesPerPage);

  const artistTotalPages = Math.ceil(filteredArtists.length / artistsPerPage);
  const artistStartIndex = (artistPage - 1) * artistsPerPage;
  const paginatedArtists = filteredArtists.slice(artistStartIndex, artistStartIndex + artistsPerPage);

  const songTotalPages = Math.ceil(filteredSongs.length / songsPerPage);
  const songStartIndex = (songPage - 1) * songsPerPage;
  const paginatedSongs = filteredSongs.slice(songStartIndex, songStartIndex + songsPerPage);

  // Group queue items by venue_group_key and artist_group_key
  const groupedVenues = queueItems.reduce((acc, item) => {
    const key = item.venue_group_key || item.venueName;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<string, QueueItem[]>);

  const groupedArtists = queueItems.reduce((acc, item) => {
    const key = item.artist_group_key || item.artistName;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<string, QueueItem[]>);

  const uniqueVenueGroups = Object.keys(groupedVenues);
  const uniqueArtistGroups = Object.keys(groupedArtists);

  // Stats
  const venueStats = {
    total: venues.length,
    validated: venues.filter(v => v.validated).length,
    unvalidated: venues.filter(v => !v.validated).length,
    hasCoords: venues.filter(v => v.latitude !== 0 && v.longitude !== 0).length,
    hasImages: venues.filter(v => v.profileImageUrl).length,
    hasPhone: venues.filter(v => v.phone).length,
  };

  const artistStats = {
    total: artists.length,
    hasOwner: artists.filter(a => memberships.some(m => m.artist_id === a.id && m.role === 'owner')).length,
  };

  const songStats = {
    total: songs.length,
    featured: songs.filter(s => s.isFeatured).length,
    hasStreaming: songs.filter(s => s.spotifyUrl || s.appleMusicUrl || s.youtubeUrl).length,
    hasAudio: songs.filter(s => s.audioFileUrl).length,
    hasGenre: songs.filter(s => s.genre).length,
    hasDuration: songs.filter(s => s.duration).length,
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Godmode Admin</h1>
        <p className="text-muted-foreground">Manage venues, artists, and songs across the platform</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="venues" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Venues ({venueStats.total})
          </TabsTrigger>
          <TabsTrigger value="artists" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Artists ({artistStats.total})
          </TabsTrigger>
          <TabsTrigger value="songs" className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            Songs ({songStats.total})
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Event Queue ({queueItems.filter(q => q.status === 'pending').length})
          </TabsTrigger>
        </TabsList>

        {/* VENUES TAB */}
        <TabsContent value="venues" className="mt-6">
          <div className="mb-6 space-y-4">
            <div className="flex justify-between items-center">
              <Input
                placeholder="Search venues by name, address, or postcode..."
                value={venueSearch}
                onChange={(e) => setVenueSearch(e.target.value)}
                className="max-w-md"
              />
              <Button onClick={fetchVenues} size="sm" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={venueFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setVenueFilter('all')}
                size="sm"
              >
                All ({venueStats.total})
              </Button>
              <Button
                variant={venueFilter === 'validated' ? 'default' : 'outline'}
                onClick={() => setVenueFilter('validated')}
                size="sm"
              >
                Validated ({venueStats.validated})
              </Button>
              <Button
                variant={venueFilter === 'unvalidated' ? 'default' : 'outline'}
                onClick={() => setVenueFilter('unvalidated')}
                size="sm"
              >
                Unvalidated ({venueStats.unvalidated})
              </Button>
              <Button
                variant={venueFilter === 'has-coords' ? 'default' : 'outline'}
                onClick={() => setVenueFilter('has-coords')}
                size="sm"
              >
                Has Coords ({venueStats.hasCoords})
              </Button>
              <Button
                variant={venueFilter === 'has-images' ? 'default' : 'outline'}
                onClick={() => setVenueFilter('has-images')}
                size="sm"
              >
                With Images ({venueStats.hasImages})
              </Button>
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
                            {venue.socialMediaURLs && Array.isArray(venue.socialMediaURLs) && venue.socialMediaURLs.some((url: string) => url && typeof url === 'string' && url.includes('facebook.com')) && (
                              <a
                                href={venue.socialMediaURLs.find((url: string) => url && typeof url === 'string' && url.includes('facebook.com'))}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                                title="Facebook"
                              >
                                <Facebook className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-muted-foreground">
                            <div>{venue.location.lat.toFixed(6)}</div>
                            <div>{venue.location.lng.toFixed(6)}</div>
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
        </TabsContent>

        {/* ARTISTS TAB */}
        <TabsContent value="artists" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2">
              <Button
                variant={artistFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setArtistFilter('all')}
                size="sm"
              >
                All ({artistStats.total})
              </Button>
              <Button
                variant={artistFilter === 'has-owner' ? 'default' : 'outline'}
                onClick={() => setArtistFilter('has-owner')}
                size="sm"
              >
                Has Owner ({artistStats.hasOwner})
              </Button>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search artists..."
                  value={artistSearch}
                  onChange={(e) => setArtistSearch(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Button onClick={fetchArtists} size="sm" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
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
                          {editingArtist === artist.id ? (
                            <Input
                              value={artistEditForm?.name || ''}
                              onChange={(e) => setArtistEditForm(prev => prev ? {...prev, name: e.target.value} : null)}
                              className="h-8"
                            />
                          ) : (
                            <div className="font-medium">{artist.name}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">{artist.location}</td>
                        <td className="px-4 py-3 text-sm">{Array.isArray(artist.genres) ? artist.genres.slice(0, 2).join(', ') : (artist.genres || '-')}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {artist.website && (
                              <a
                                href={artist.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                                title={artist.website}
                              >
                                <Globe className="h-4 w-4" />
                              </a>
                            )}
                            {artist.socialMediaURLs && Array.isArray(artist.socialMediaURLs) && artist.socialMediaURLs.some((url: string) => url && typeof url === 'string' && url.includes('facebook.com')) && (
                              <a
                                href={artist.socialMediaURLs.find((url: string) => url && typeof url === 'string' && url.includes('facebook.com'))}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                                title="Facebook"
                              >
                                <Facebook className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            // Find owner membership for this artist
                            const ownerMembership = memberships.find(
                              m => m.artist_id === artist.id && m.role === 'owner'
                            );

                            if (ownerMembership) {
                              // Find the user by matching cognito_id
                              // membership.user_id contains cognito_id, match with user.cognitoId
                              const ownerUser = users.find(u => u.cognitoId === ownerMembership.user_id);

                              if (ownerUser) {
                                return (
                                  <div className="text-sm font-medium">
                                    {ownerUser.displayName || ownerUser.username}
                                  </div>
                                );
                              }

                              // Found membership but user not in list
                              return <span className="text-yellow-600 text-sm">Owner (user not found)</span>;
                            }

                            // No owner membership found
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
                            {editingArtist === artist.id ? (
                              <>
                                <Button size="sm" variant="default" onClick={handleArtistEditSave}>
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingArtist(null)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" variant="outline" onClick={() => handleArtistEditStart(artist)}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleArtistDelete(artist.id)}
                                  disabled={deletingArtist === artist.id}
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
        </TabsContent>

        {/* SONGS TAB */}
        <TabsContent value="songs" className="mt-6">
          <div className="mb-6 space-y-4">
            <div className="flex justify-between items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search songs by title, artist, genre, or album..."
                  value={songSearch}
                  onChange={(e) => setSongSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button onClick={fetchSongs} size="sm" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={songFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setSongFilter('all')}
                size="sm"
              >
                All ({songStats.total})
              </Button>
              <Button
                variant={songFilter === 'featured' ? 'default' : 'outline'}
                onClick={() => setSongFilter('featured')}
                size="sm"
              >
                Featured ({songStats.featured})
              </Button>
              <Button
                variant={songFilter === 'has-streaming' ? 'default' : 'outline'}
                onClick={() => setSongFilter('has-streaming')}
                size="sm"
              >
                Streaming ({songStats.hasStreaming})
              </Button>
              <Button
                variant={songFilter === 'has-audio' ? 'default' : 'outline'}
                onClick={() => setSongFilter('has-audio')}
                size="sm"
              >
                Audio ({songStats.hasAudio})
              </Button>
              <Button
                variant={songFilter === 'has-genre' ? 'default' : 'outline'}
                onClick={() => setSongFilter('has-genre')}
                size="sm"
              >
                Genre ({songStats.hasGenre})
              </Button>
            </div>
          </div>

          {songsLoading && <div className="text-center py-12"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div>}
          {songsError && <div className="text-destructive text-center py-12">{songsError}</div>}

          {!songsLoading && !songsError && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Artist</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Genre</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Duration</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Featured</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedSongs.map(song => (
                      <tr key={song.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          {editingSong === song.id ? (
                            <Input
                              value={songEditForm?.title || ''}
                              onChange={(e) => setSongEditForm(prev => prev ? {...prev, title: e.target.value} : null)}
                              className="h-8"
                            />
                          ) : (
                            <div className="font-medium">{song.title}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">{song.artistName}</td>
                        <td className="px-4 py-3 text-sm">{song.genre || '-'}</td>
                        <td className="px-4 py-3 text-sm">{formatDuration(song.duration)}</td>
                        <td className="px-4 py-3">
                          {song.isFeatured && <CheckCircle className="h-4 w-4 text-green-500" />}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {editingSong === song.id ? (
                              <>
                                <Button size="sm" variant="default" onClick={handleSongEditSave}>
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingSong(null)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" variant="outline" onClick={() => handleSongEditStart(song)}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleSongDelete(song.id)}
                                  disabled={deletingSong === song.id}
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

              {/* Songs Pagination */}
              {songTotalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {songStartIndex + 1}-{Math.min(songStartIndex + songsPerPage, filteredSongs.length)} of {filteredSongs.length} songs
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSongPage(p => Math.max(1, p - 1))}
                      disabled={songPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-2 px-3">
                      <span className="text-sm">Page {songPage} of {songTotalPages}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSongPage(p => Math.min(songTotalPages, p + 1))}
                      disabled={songPage === songTotalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </TabsContent>

        {/* USERS TAB */}
        <TabsContent value="users" className="mt-6">
          <div className="mb-6 space-y-4">
            <div className="flex justify-between items-center">
              <Input
                placeholder="Search users by name, email, or phone..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="max-w-md"
              />
              <Button onClick={fetchUsers} size="sm" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={userFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setUserFilter('all')}
                size="sm"
              >
                All ({users.length})
              </Button>
              <Button
                variant={userFilter === 'completed' ? 'default' : 'outline'}
                onClick={() => setUserFilter('completed')}
                size="sm"
              >
                Complete ({users.filter(u => u.profileCompleted).length})
              </Button>
              <Button
                variant={userFilter === 'incomplete' ? 'default' : 'outline'}
                onClick={() => setUserFilter('incomplete')}
                size="sm"
              >
                Incomplete ({users.filter(u => !u.profileCompleted).length})
              </Button>
              <Button
                variant={userFilter === 'with-bands' ? 'default' : 'outline'}
                onClick={() => setUserFilter('with-bands')}
                size="sm"
              >
                With Artists ({users.filter(u => u.membershipCount > 0).length})
              </Button>
              <Button
                variant={userFilter === 'no-bands' ? 'default' : 'outline'}
                onClick={() => setUserFilter('no-bands')}
                size="sm"
              >
                No Artists ({users.filter(u => u.membershipCount === 0).length})
              </Button>
            </div>
          </div>

          {usersLoading && <div className="text-center py-12"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div>}
          {usersError && <div className="text-destructive text-center py-12">{usersError}</div>}

          {!usersLoading && !usersError && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Auth Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Display Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Profile</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Artists</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Created</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users
                      .filter(u => {
                        const matchesSearch = (u.displayName && u.displayName.toLowerCase().includes(userSearch.toLowerCase())) ||
                                            (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase())) ||
                                            (u.phone && u.phone.includes(userSearch));
                        if (!matchesSearch) return false;
                        if (userFilter === 'completed') return u.profileCompleted;
                        if (userFilter === 'incomplete') return !u.profileCompleted;
                        if (userFilter === 'with-bands') return u.membershipCount > 0;
                        if (userFilter === 'no-bands') return u.membershipCount === 0;
                        return true;
                      })
                      .slice((userPage - 1) * usersPerPage, userPage * usersPerPage)
                      .map(user => (
                        <tr key={user.id} className="hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted">
                              {user.authType}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{user.displayName || <span className="text-muted-foreground italic">NULL</span>}</div>
                            {user.firstName && user.lastName && (
                              <div className="text-xs text-muted-foreground">{user.firstName} {user.lastName}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm">{user.email || user.phone || <span className="text-muted-foreground italic">-</span>}</div>
                          </td>
                          <td className="px-4 py-3">
                            {user.profileCompleted ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-yellow-500" />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium">{user.membershipCount}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-muted-foreground">
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleUserDelete(user.id)}
                              disabled={deletingUser === user.id}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Users Pagination */}
              {Math.ceil(users.length / usersPerPage) > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(userPage - 1) * usersPerPage + 1}-{Math.min(userPage * usersPerPage, users.length)} of {users.length} users
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUserPage(p => Math.max(1, p - 1))}
                      disabled={userPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-2 px-3">
                      <span className="text-sm">Page {userPage} of {Math.ceil(users.length / usersPerPage)}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUserPage(p => Math.min(Math.ceil(users.length / usersPerPage), p + 1))}
                      disabled={userPage === Math.ceil(users.length / usersPerPage)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </TabsContent>

        {/* EVENT QUEUE TAB */}
        <TabsContent value="queue" className="mt-6">
          <div className="mb-6 space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Process in order: Venues → Artists → Events
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setShowHtmlInput(!showHtmlInput)} size="sm" variant="outline">
                  {showHtmlInput ? 'Hide' : 'Paste HTML'}
                </Button>
                <Button onClick={handleLoadPOCResults} size="sm" variant="outline">
                  Load POC Results
                </Button>
                <Button onClick={fetchEventQueue} size="sm" variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* HTML Input Area */}
          {showHtmlInput && (
            <Card className="p-4 mb-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Paste HTML from gigs-news.uk</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Open gigs-news.uk, right-click → "Save As" → "Webpage, HTML Only", then paste the contents here
                  </p>
                  <textarea
                    value={htmlInput}
                    onChange={(e) => setHtmlInput(e.target.value)}
                    className="w-full h-40 p-3 border rounded font-mono text-xs"
                    placeholder="<html>...</html>"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    {htmlInput.length > 0 && `${Math.round(htmlInput.length / 1024)}KB pasted`}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setHtmlInput('')} size="sm" variant="outline" disabled={!htmlInput}>
                      Clear
                    </Button>
                    <Button onClick={handleExtractFromHTML} size="sm" variant="default" disabled={!htmlInput.trim()}>
                      Extract Events
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {queueLoading && <div className="text-center py-12"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div>}
          {queueError && <div className="text-destructive text-center py-12">{queueError}</div>}

          {!queueLoading && !queueError && queueItems.length === 0 && (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No events in the review queue</p>
                <Button onClick={handleLoadPOCResults} size="sm" variant="outline" className="mt-4">
                  Load POC Results to Test
                </Button>
              </div>
            </Card>
          )}

          {!queueLoading && !queueError && queueItems.length > 0 && (
            <Tabs value={queuePhase} onValueChange={(val) => setQueuePhase(val as 'venues' | 'artists' | 'events')} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="venues">
                  Phase 1: Venues ({uniqueVenueGroups.length})
                </TabsTrigger>
                <TabsTrigger value="artists">
                  Phase 2: Artists ({uniqueArtistGroups.length})
                </TabsTrigger>
                <TabsTrigger value="events">
                  Phase 3: Events ({queueItems.length})
                </TabsTrigger>
              </TabsList>

              {/* PHASE 1: VENUES TAB */}
              <TabsContent value="venues" className="mt-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">Phase 1: Venues</h3>
                  <p className="text-sm text-muted-foreground">
                    {uniqueVenueGroups.length} unique venues. Approve to create/match venues and enrich with Facebook URLs.
                  </p>
                </div>

                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase">Venue Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase">Confidence</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase">Facebook</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase">Website</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase">Events</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {uniqueVenueGroups.map(groupKey => {
                          const items = groupedVenues[groupKey];
                          const firstItem = items[0];
                          const isMatch = firstItem.venueResolution.action === 'MATCH_EXISTING';
                          const isCreate = firstItem.venueResolution.action === 'CREATE_NEW';
                          const hasExistingFB = firstItem.venueResolution.matched_venue?.facebookUrl;
                          const willEnrichFB = isMatch && !hasExistingFB && firstItem.facebookUrl;

                          return (
                            <tr key={groupKey} className="hover:bg-muted/50">
                              <td className="px-4 py-3">
                                <div className="font-medium">{firstItem.venueName}</div>
                                {firstItem.venueResolution.enrichments?.address && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {firstItem.venueResolution.enrichments.address}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                  isMatch ? 'bg-green-100 text-green-800' :
                                  isCreate ? 'bg-blue-100 text-blue-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {isMatch ? 'Match' : isCreate ? 'New' : 'Review'}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium">
                                  {Math.round(firstItem.venueResolution.confidence * 100)}%
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {firstItem.venueResolution.reasons.slice(0, 2).join(', ')}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {willEnrichFB ? (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <CheckCircle className="h-3 w-3" />
                                    <span className="text-xs">Will add</span>
                                  </div>
                                ) : hasExistingFB ? (
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <CheckCircle className="h-3 w-3" />
                                    <span className="text-xs">Has URL</span>
                                  </div>
                                ) : firstItem.facebookUrl ? (
                                  <a
                                    href={firstItem.facebookUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                  >
                                    <Facebook className="h-3 w-3" />
                                    Event
                                  </a>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {firstItem.venueResolution.enrichments?.website ? (
                                  <a
                                    href={firstItem.venueResolution.enrichments.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                  >
                                    <Globe className="h-3 w-3" />
                                    Link
                                  </a>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium">{items.length}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      items.forEach(item => handleRejectQueueItem(item.queue_id));
                                    }}
                                    disabled={processingQueue !== null}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => {
                                      handleApproveQueueItem(firstItem.queue_id);
                                    }}
                                    disabled={processingQueue !== null}
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </TabsContent>

              {/* PHASE 2: ARTISTS TAB */}
              <TabsContent value="artists" className="mt-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Process Unique Artists</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {uniqueArtistGroups.length} unique artists found. Complete venue processing first.
                  </p>
                  <div className="space-y-4">
                    {uniqueArtistGroups.map(groupKey => {
                      const items = groupedArtists[groupKey];
                      const firstItem = items[0];
                      return (
                        <div key={groupKey} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">{firstItem.artistName}</h4>
                              <div className="text-sm text-muted-foreground mt-1">
                                Appears in {items.length} event{items.length > 1 ? 's' : ''}
                              </div>
                            </div>
                            <div className={`px-3 py-1 rounded text-xs font-medium ${
                              firstItem.artistResolution.action === 'MATCH_EXISTING' ? 'bg-green-100 text-green-800' :
                              firstItem.artistResolution.action === 'CREATE_NEW' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {firstItem.artistResolution.action}
                            </div>
                          </div>

                          <div className="space-y-2 text-sm mb-4">
                            <div>
                              <span className="text-muted-foreground">Confidence: </span>
                              <span className="font-medium">{Math.round(firstItem.artistResolution.confidence * 100)}%</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Reasons: </span>
                              <span className="font-medium">{firstItem.artistResolution.reasons.join(', ')}</span>
                            </div>
                            {firstItem.artistResolution.artist_id && (
                              <div>
                                <span className="text-muted-foreground">Matched ID: </span>
                                <span className="font-mono text-xs">{firstItem.artistResolution.artist_id.substring(0, 8)}...</span>
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                items.forEach(item => handleRejectQueueItem(item.queue_id));
                              }}
                              disabled={processingQueue !== null}
                            >
                              <X className="h-3 w-3 mr-2" />
                              Dismiss All ({items.length})
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                handleApproveQueueItem(firstItem.queue_id);
                              }}
                              disabled={processingQueue !== null}
                            >
                              <CheckCircle className="h-3 w-3 mr-2" />
                              Approve Artist
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </TabsContent>

              {/* PHASE 3: EVENTS TAB */}
              <TabsContent value="events" className="mt-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Review Individual Events</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {queueItems.length} events ready for review. Complete venues and artists first.
                  </p>
                  <div className="space-y-4">
                    {queueItems.map(item => (
                  <Card key={item.queue_id} className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left Column - Extracted Data */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Extracted Event</h3>
                        <div className="space-y-2">
                          <div>
                            <div className="text-sm text-muted-foreground">Artist</div>
                            <div className="font-medium">{item.artistName}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Venue</div>
                            <div className="font-medium">{item.venueName}</div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm text-muted-foreground">Date</div>
                              <div className="font-medium">{item.date}</div>
                            </div>
                            {item.time && (
                              <div>
                                <div className="text-sm text-muted-foreground">Time</div>
                                <div className="font-medium">{item.time}</div>
                              </div>
                            )}
                          </div>
                          {item.notes && (
                            <div>
                              <div className="text-sm text-muted-foreground">Notes</div>
                              <div className="text-sm">{item.notes}</div>
                            </div>
                          )}
                          {item.facebookUrl && (
                            <div>
                              <div className="text-sm text-muted-foreground">Facebook URL</div>
                              <a href={item.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" />
                                Event Link
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Column - Resolution Details */}
                      <div className="space-y-4">
                        {/* Venue Resolution */}
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold">Venue Resolution</h4>
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              item.venueResolution.action === 'MATCH_EXISTING' ? 'bg-green-100 text-green-800' :
                              item.venueResolution.action === 'CREATE_NEW' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {item.venueResolution.action}
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Confidence: </span>
                              <span className="font-medium">{Math.round(item.venueResolution.confidence * 100)}%</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Reasons: </span>
                              <span className="font-medium">{item.venueResolution.reasons.join(', ')}</span>
                            </div>
                            {item.venueResolution.venue_id && (
                              <div>
                                <span className="text-muted-foreground">Matched Venue ID: </span>
                                <span className="font-mono text-xs">{item.venueResolution.venue_id}</span>
                              </div>
                            )}
                            {item.venueResolution.enrichments && (
                              <div className="mt-2 pt-2 border-t">
                                <div className="text-muted-foreground mb-1">Enrichments:</div>
                                {item.venueResolution.enrichments.address && (
                                  <div className="text-xs">{item.venueResolution.enrichments.address}</div>
                                )}
                                {item.venueResolution.enrichments.website && (
                                  <a href={item.venueResolution.enrichments.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800">
                                    {item.venueResolution.enrichments.website}
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Artist Resolution */}
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold">Artist Resolution</h4>
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              item.artistResolution.action === 'MATCH_EXISTING' ? 'bg-green-100 text-green-800' :
                              item.artistResolution.action === 'CREATE_NEW' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {item.artistResolution.action}
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Confidence: </span>
                              <span className="font-medium">{Math.round(item.artistResolution.confidence * 100)}%</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Reasons: </span>
                              <span className="font-medium">{item.artistResolution.reasons.join(', ')}</span>
                            </div>
                            {item.artistResolution.artist_id && (
                              <div>
                                <span className="text-muted-foreground">Matched Artist ID: </span>
                                <span className="font-mono text-xs">{item.artistResolution.artist_id}</span>
                              </div>
                            )}
                            {item.artistResolution.suggestion && (
                              <div className="mt-2 pt-2 border-t">
                                <div className="text-muted-foreground mb-1">Suggestion:</div>
                                <div className="text-xs">{item.artistResolution.suggestion}</div>
                              </div>
                            )}
                            {item.artistResolution.candidates && item.artistResolution.candidates.length > 0 && (
                              <div className="mt-2 pt-2 border-t">
                                <div className="text-muted-foreground mb-1">Candidates:</div>
                                {item.artistResolution.candidates.slice(0, 3).map((candidate, idx) => (
                                  <div key={idx} className="text-xs py-1">
                                    {candidate.artist.name} ({Math.round(candidate.score * 100)}%) - {candidate.reasons.join(', ')}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
                      <Button
                        variant="outline"
                        onClick={() => handleRejectQueueItem(item.queue_id)}
                        disabled={processingQueue === item.queue_id}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        variant="default"
                        onClick={() => handleApproveQueueItem(item.queue_id)}
                        disabled={processingQueue === item.queue_id}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve & Create Event
                      </Button>
                    </div>
                  </Card>
                ))}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <ConfirmDialog />
    </div>
  );
}
