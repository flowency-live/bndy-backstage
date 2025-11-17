import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import ScoreDisplay from "../features/score-display";
import SpotifyEmbedPlayer from "@/components/spotify-embed-player";
import { useState } from "react";
import { artistsService } from "@/lib/services/artists-service";

interface PipelineSong {
  id: string;
  artist_id: string;
  song_id: string;
  status: string;
  votes: Record<string, { value: number; updated_at: string }>;
  vote_score_percentage: number;
  suggested_by_user_id: string;
  suggested_comment: string;
  globalSong: {
    id: string;
    title: string;
    artist_name: string;
    album: string;
    spotify_url: string;
    thumbnail_url?: string;
  };
}

interface ReviewSongCardProps {
  song: PipelineSong;
  memberCount: number;
}

export default function ReviewSongCard({ song, memberCount }: ReviewSongCardProps) {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const queryClient = useQueryClient();
  const [showPlayer, setShowPlayer] = useState(false);

  const voteCount = Object.keys(song.votes || {}).length;
  const zeroVoteCount = Object.values(song.votes || {}).filter(v => v.value === 0).length;

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return await artistsService.updatePipelineStatus(song.artist_id, song.id, newStatus);
    },
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline', song.artist_id] });
      const statusLabels: Record<string, string> = {
        practice: 'Practice',
        parked: 'Parked',
        discarded: 'Discarded'
      };
      toast({
        title: 'Status changed',
        description: `Song moved to ${statusLabels[newStatus]}`
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to change song status',
        variant: 'destructive'
      });
    }
  });

  const handleDiscard = async () => {
    const confirmed = await confirm({
      title: 'Discard this song?',
      description: 'This will archive the song. You can restore it later from the Archived tab.'
    });

    if (confirmed) {
      statusMutation.mutate('discarded');
    }
  };

  return (
    <>
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        {/* Header with Album Art */}
        <div className="p-4 flex gap-3 items-start border-b border-border">
          <div className="flex-shrink-0">
            {song.globalSong.thumbnail_url ? (
              <img
                src={song.globalSong.thumbnail_url}
                alt={song.globalSong.title}
                className="w-20 h-20 rounded object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded bg-muted flex items-center justify-center">
                <i className="fas fa-music text-muted-foreground text-2xl"></i>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-foreground truncate">
              {song.globalSong.title}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {song.globalSong.artist_name}
            </p>
            {song.suggested_comment && (
              <p className="text-sm text-muted-foreground italic mt-2 line-clamp-2">
                "{song.suggested_comment}"
              </p>
            )}
          </div>
        </div>

        {/* Score Display */}
        <ScoreDisplay
          score={song.vote_score_percentage}
          voteCount={voteCount}
          zeroVoteCount={zeroVoteCount}
        />

        {/* Spotify Player */}
        {song.globalSong.spotify_url && (
          <div className="px-4 pb-4">
            <button
              onClick={() => setShowPlayer(!showPlayer)}
              className="w-full px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors text-sm font-medium"
            >
              <i className={`fas fa-${showPlayer ? 'times' : 'play'} mr-2`}></i>
              {showPlayer ? 'Hide Preview' : 'Play Preview'}
            </button>
            {showPlayer && (
              <div className="mt-3 rounded-lg overflow-hidden">
                <SpotifyEmbedPlayer
                  spotifyUrl={song.globalSong.spotify_url}
                  onClose={() => setShowPlayer(false)}
                />
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-4 border-t border-border">
          <p className="text-sm text-muted-foreground mb-3">Move to...</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => statusMutation.mutate('practice')}
              disabled={statusMutation.isPending}
              className="p-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 transition-all flex flex-col items-center gap-2 disabled:opacity-50"
            >
              <i className="fas fa-guitar text-amber-500 text-xl"></i>
              <span className="text-xs font-medium text-amber-500">Practice</span>
            </button>

            <button
              onClick={() => statusMutation.mutate('parked')}
              disabled={statusMutation.isPending}
              className="p-3 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 transition-all flex flex-col items-center gap-2 disabled:opacity-50"
            >
              <i className="fas fa-pause-circle text-blue-500 text-xl"></i>
              <span className="text-xs font-medium text-blue-500">Park</span>
            </button>

            <button
              onClick={handleDiscard}
              disabled={statusMutation.isPending}
              className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-all flex flex-col items-center gap-2 disabled:opacity-50"
            >
              <i className="fas fa-times-circle text-muted-foreground text-xl"></i>
              <span className="text-xs font-medium text-muted-foreground">Discard</span>
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog />
    </>
  );
}
