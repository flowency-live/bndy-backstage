import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { artistsService } from "@/lib/services/artists-service";
import type { ArtistMembership, Artist } from "@/types/api";

interface ArchivedTabProps {
  artistId: string;
  membership: ArtistMembership & { artist: Artist };
}

export default function ArchivedTab({ artistId, membership }: ArchivedTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: archivedSongs = [], isLoading: loadingArchived } = useQuery({
    queryKey: ['pipeline', artistId, 'archived'],
    queryFn: async () => {
      return await artistsService.getArchivedPipelineSongs(artistId);
    }
  });

  const parkedSongs = archivedSongs.filter((song: any) => song.status === 'parked');
  const discardedSongs = archivedSongs.filter((song: any) => song.status === 'discarded');
  const loadingParked = loadingArchived;
  const loadingDiscarded = loadingArchived;

  const statusMutation = useMutation({
    mutationFn: async ({ songId, newStatus }: { songId: string; newStatus: string }) => {
      return await artistsService.updatePipelineStatus(artistId, songId, newStatus);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline', artistId] });
      toast({ title: 'Song restored', description: 'Song moved successfully' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (songId: string) => {
      return await artistsService.deletePipelineSong(artistId, songId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline', artistId] });
      toast({ title: 'Song deleted', description: 'Song permanently removed from pipeline' });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete song';
      toast({
        title: 'Delete failed',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  });

  const isLoading = loadingParked || loadingDiscarded;
  const hasAnySongs = parkedSongs.length > 0 || discardedSongs.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-3xl text-muted-foreground mb-2"></i>
          <p className="text-muted-foreground">Loading archived songs...</p>
        </div>
      </div>
    );
  }

  if (!hasAnySongs) {
    return (
      <div className="text-center py-12">
        <i className="fas fa-archive text-4xl text-muted-foreground mb-4"></i>
        <h3 className="text-lg font-medium mb-2">No archived songs</h3>
        <p className="text-muted-foreground">Parked and discarded songs will appear here</p>
      </div>
    );
  }

  const SongCard = ({ song, type }: { song: any; type: 'parked' | 'discarded' }) => (
    <div className="rounded-lg border border-border p-4 bg-card">
      <div className="flex gap-3 mb-4">
        {song.globalSong.thumbnail_url ? (
          <img
            src={song.globalSong.thumbnail_url}
            alt={song.globalSong.title}
            className="w-16 h-16 rounded object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded bg-muted flex items-center justify-center">
            <i className="fas fa-music text-muted-foreground"></i>
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-medium text-foreground">{song.globalSong.title}</h3>
          <p className="text-sm text-muted-foreground">{song.globalSong.artist_name}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            type === 'parked' ? 'bg-blue-500/20 text-blue-500' : 'bg-muted text-muted-foreground'
          }`}>
            {type === 'parked' ? 'Parked' : 'Discarded'}
          </span>
        </div>
      </div>

      {song.notes && song.notes.trim() && (
        <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-start gap-2">
            <i className="fas fa-sticky-note text-muted-foreground mt-0.5"></i>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{song.notes}</p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => statusMutation.mutate({ songId: song.id, newStatus: 'voting' })}
          disabled={statusMutation.isPending}
          className="flex-1 px-3 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-sm font-medium transition-colors"
        >
          <i className="fas fa-vote-yea mr-2"></i>
          To Voting
        </button>
        <button
          onClick={() => statusMutation.mutate({ songId: song.id, newStatus: 'practice' })}
          disabled={statusMutation.isPending}
          className="flex-1 px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 text-sm font-medium transition-colors"
        >
          <i className="fas fa-guitar mr-2"></i>
          To Practice
        </button>
        <button
          onClick={() => setDeleteConfirmId(song.id)}
          disabled={deleteMutation.isPending}
          className="px-3 py-2 rounded-lg bg-destructive/20 hover:bg-destructive/30 text-destructive transition-colors"
          title="Permanently delete"
        >
          <i className="fas fa-trash"></i>
        </button>
      </div>
    </div>
  );

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteMutation.mutate(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-card rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">
                <i className="fas fa-trash text-destructive"></i>
              </div>
              <h3 className="text-xl font-semibold mb-3">Permanently Delete Song?</h3>
              <p className="text-muted-foreground">
                This will permanently remove this song from the pipeline. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-3 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors font-medium"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parked Section */}
      {parkedSongs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <i className="fas fa-pause-circle text-blue-500"></i>
            Parked Songs ({parkedSongs.length})
          </h3>
          <div className="space-y-3">
            {parkedSongs.map((song: any) => (
              <SongCard key={song.id} song={song} type="parked" />
            ))}
          </div>
        </div>
      )}

      {/* Discarded Section */}
      {discardedSongs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <i className="fas fa-times-circle text-muted-foreground"></i>
            Discarded Songs ({discardedSongs.length})
          </h3>
          <div className="space-y-3">
            {discardedSongs.map((song: any) => (
              <SongCard key={song.id} song={song} type="discarded" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
