import { useState, useEffect } from 'react';
import { Music, RefreshCw, Edit, Trash2, Save, X, Search, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  getAllSongs,
  updateSong,
  deleteSong,
  formatDuration,
  type Song,
} from '@/lib/services/godmode-service';
import { useConfirm } from '@/hooks/use-confirm';

export default function SongsPage() {
  const { confirm, ConfirmDialog } = useConfirm();

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

  // Fetch Songs
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

  useEffect(() => {
    fetchSongs();
  }, []);

  // Reset page when search changes
  useEffect(() => {
    setSongPage(1);
  }, [songSearch, songFilter]);

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

  // Filtered Data
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
  const songTotalPages = Math.ceil(filteredSongs.length / songsPerPage);
  const songStartIndex = (songPage - 1) * songsPerPage;
  const paginatedSongs = filteredSongs.slice(songStartIndex, songStartIndex + songsPerPage);

  // Stats
  const songStats = {
    total: songs.length,
    featured: songs.filter(s => s.isFeatured).length,
    hasStreaming: songs.filter(s => s.spotifyUrl || s.appleMusicUrl || s.youtubeUrl).length,
    hasAudio: songs.filter(s => s.audioFileUrl).length,
    hasGenre: songs.filter(s => s.genre).length,
    hasDuration: songs.filter(s => s.duration).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Music className="h-8 w-8" />
            Songs
          </h1>
          <p className="text-muted-foreground mt-1">Manage songs across the platform</p>
        </div>
      </div>

      <div className="space-y-4">
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

      {/* Confirmation Dialog */}
      <ConfirmDialog />
    </div>
  );
}
