// Godmode › Songs — dense table with a compact edit dialog.

import { useMemo, useState } from 'react';
import { Edit, Music, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useConfirm } from '@/hooks/use-confirm';
import { useToast } from '@/hooks/use-toast';
import { formatDuration, type Song } from '@/lib/services/godmode-service';
import DataTable, { type Column } from '../components/DataTable';
import {
  BoolMark,
  FacetChips,
  GodmodePageHeader,
  TableSearch,
  useInitialUrlFilter,
} from '../components/godmode-ui';
import { useDeleteSong, useGodmodeSongs, useUpdateSong } from '../lib/queries';

function getYear(releaseDate: string | null): number | null {
  if (!releaseDate) return null;
  const year = new Date(releaseDate).getFullYear();
  return Number.isNaN(year) ? null : year;
}

export default function SongsPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const { toast } = useToast();

  const songsQuery = useGodmodeSongs();
  const updateSong = useUpdateSong();
  const deleteSong = useDeleteSong();
  const songs = songsQuery.data ?? [];

  const [facet, setFacet] = useInitialUrlFilter('all');
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('all');
  const [editForm, setEditForm] = useState<Song | null>(null);
  const [saving, setSaving] = useState(false);

  const uniqueGenres = useMemo(
    () => Array.from(new Set(songs.map((s) => s.genre).filter(Boolean))).sort(),
    [songs],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return songs.filter((s) => {
      if (q) {
        const hit =
          (s.title && String(s.title).toLowerCase().includes(q)) ||
          (s.artistName && String(s.artistName).toLowerCase().includes(q)) ||
          (s.genre && String(s.genre).toLowerCase().includes(q)) ||
          (s.album && String(s.album).toLowerCase().includes(q));
        if (!hit) return false;
      }
      switch (facet) {
        case 'featured': if (!s.isFeatured) return false; break;
        case 'has-streaming': if (!(s.spotifyUrl || s.appleMusicUrl || s.youtubeUrl)) return false; break;
        case 'has-audio': if (!s.audioFileUrl) return false; break;
        case 'no-genre': if (s.genre) return false; break;
      }
      if (genreFilter !== 'all' && s.genre !== genreFilter) return false;
      return true;
    });
  }, [songs, search, facet, genreFilter]);

  const facets = useMemo(
    () => [
      { value: 'all', label: 'All', count: songs.length },
      { value: 'featured', label: 'Featured', count: songs.filter((s) => s.isFeatured).length },
      {
        value: 'has-streaming',
        label: 'Has streaming',
        count: songs.filter((s) => s.spotifyUrl || s.appleMusicUrl || s.youtubeUrl).length,
      },
      { value: 'has-audio', label: 'Has audio', count: songs.filter((s) => s.audioFileUrl).length },
      { value: 'no-genre', label: 'No genre', count: songs.filter((s) => !s.genre).length, warn: true },
    ],
    [songs],
  );

  const handleDelete = async (song: Song) => {
    const confirmed = await confirm({
      title: 'Delete Song',
      description: `Delete "${song.title}"? This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;
    try {
      await deleteSong.mutateAsync(song.id);
      toast({ title: 'Song deleted' });
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const toggleFeatured = async (song: Song) => {
    try {
      await updateSong.mutateAsync({ id: song.id, data: { isFeatured: !song.isFeatured } });
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleEditSave = async () => {
    if (!editForm) return;
    setSaving(true);
    try {
      await updateSong.mutateAsync({ id: editForm.id, data: editForm });
      toast({ title: 'Song saved' });
      setEditForm(null);
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Song>[] = [
    {
      key: 'title',
      header: 'Title',
      sortValue: (s) => s.title,
      render: (s) => (
        <span className="flex items-center gap-1.5 font-medium">
          {s.isFeatured && <Star className="h-3.5 w-3.5 shrink-0 fill-yellow-400 text-yellow-400" />}
          <span className="truncate">{s.title}</span>
        </span>
      ),
    },
    {
      key: 'artist',
      header: 'Artist',
      sortValue: (s) => s.artistName,
      render: (s) => <span className="text-muted-foreground truncate">{s.artistName || '—'}</span>,
    },
    {
      key: 'genre',
      header: 'Genre',
      widthClass: 'w-28',
      sortValue: (s) => s.genre,
      render: (s) => s.genre || <span className="text-orange-500">—</span>,
    },
    {
      key: 'year',
      header: 'Year',
      widthClass: 'w-16',
      align: 'right',
      className: 'hidden lg:table-cell',
      sortValue: (s) => getYear(s.releaseDate),
      render: (s) => getYear(s.releaseDate) ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'duration',
      header: 'Length',
      widthClass: 'w-20',
      align: 'right',
      className: 'hidden lg:table-cell',
      sortValue: (s) => s.duration,
      render: (s) => <span className="tabular-nums text-muted-foreground">{formatDuration(s.duration)}</span>,
    },
    {
      key: 'streaming',
      header: 'Streaming',
      widthClass: 'w-24',
      sortValue: (s) => (s.spotifyUrl || s.appleMusicUrl || s.youtubeUrl ? 1 : 0),
      render: (s) => <BoolMark value={Boolean(s.spotifyUrl || s.appleMusicUrl || s.youtubeUrl)} />,
    },
    {
      key: 'audio',
      header: 'Audio',
      widthClass: 'w-16',
      className: 'hidden xl:table-cell',
      sortValue: (s) => (s.audioFileUrl ? 1 : 0),
      render: (s) => <BoolMark value={Boolean(s.audioFileUrl)} />,
    },
    {
      key: 'actions',
      header: '',
      widthClass: 'w-24',
      render: (s) => (
        <span className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            title={s.isFeatured ? 'Unfeature' : 'Feature'}
            onClick={() => toggleFeatured(s)}
          >
            <Star className={`h-3.5 w-3.5 ${s.isFeatured ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            title="Edit"
            onClick={() => setEditForm({ ...s })}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            title="Delete"
            onClick={() => handleDelete(s)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <GodmodePageHeader
        icon={Music}
        title="Songs"
        count={`${filtered.length.toLocaleString()} of ${songs.length.toLocaleString()}`}
        isFetching={songsQuery.isFetching}
        onRefresh={() => songsQuery.refetch()}
      />

      <div className="flex flex-wrap items-center gap-3">
        <TableSearch value={search} onChange={setSearch} placeholder="Search title, artist, genre, album…" />
        <select
          value={genreFilter}
          onChange={(e) => setGenreFilter(e.target.value)}
          className="h-8 rounded-md border bg-background px-2 text-sm"
        >
          <option value="all">Any genre</option>
          {uniqueGenres.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>
        <FacetChips facets={facets} active={facet} onChange={setFacet} />
      </div>

      {songsQuery.isError ? (
        <div className="py-12 text-center text-destructive">{(songsQuery.error as Error).message}</div>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(s) => s.id}
          onRowClick={(s) => setEditForm({ ...s })}
          defaultSort={{ key: 'title', dir: 'asc' }}
          emptyMessage={songsQuery.isLoading ? 'Loading songs…' : 'No songs match the current filters.'}
        />
      )}

      <ConfirmDialog />

      {/* Compact edit dialog */}
      <Dialog open={editForm !== null} onOpenChange={(open) => !open && setEditForm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit song</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="song-title">Title</Label>
                  <Input
                    id="song-title"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="song-artist">Artist</Label>
                  <Input
                    id="song-artist"
                    value={editForm.artistName ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, artistName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="song-genre">Genre</Label>
                  <Input
                    id="song-genre"
                    value={editForm.genre ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="song-album">Album</Label>
                  <Input
                    id="song-album"
                    value={editForm.album ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, album: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="song-release">Release date</Label>
                  <Input
                    id="song-release"
                    type="date"
                    value={editForm.releaseDate ? editForm.releaseDate.split('T')[0] : ''}
                    onChange={(e) => setEditForm({ ...editForm, releaseDate: e.target.value || null })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="song-spotify">Spotify URL</Label>
                  <Input
                    id="song-spotify"
                    value={editForm.spotifyUrl ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, spotifyUrl: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="song-youtube">YouTube URL</Label>
                  <Input
                    id="song-youtube"
                    value={editForm.youtubeUrl ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, youtubeUrl: e.target.value })}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={editForm.isFeatured}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, isFeatured: checked === true })}
                />
                Featured
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditForm(null)}>
                  Cancel
                </Button>
                <Button onClick={handleEditSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
