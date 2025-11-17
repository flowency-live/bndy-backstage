import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import RagStrip from "../features/rag-strip";
import RagStatusControls from "../features/rag-status-controls";
import { artistsService } from "@/lib/services/artists-service";

interface PipelineSong {
  id: string;
  artist_id: string;
  song_id: string;
  status: string;
  rag_status: Record<string, { status: string; updated_at: string }>;
  globalSong: {
    id: string;
    title: string;
    artist_name: string;
    album: string;
    thumbnail_url?: string;
  };
}

interface PracticeSongCardProps {
  song: PipelineSong;
  userId: string;
  memberCount: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export default function PracticeSongCard({
  song,
  userId,
  memberCount,
  isExpanded,
  onToggleExpand
}: PracticeSongCardProps) {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const queryClient = useQueryClient();

  const userRagStatus = song.rag_status?.[userId]?.status as 'RED' | 'AMBER' | 'GREEN' | null;
  const needsRagStatus = !userRagStatus;

  const ragMutation = useMutation({
    mutationFn: async (status: 'RED' | 'AMBER' | 'GREEN') => {
      return await artistsService.updatePipelineRAGStatus(song.artist_id, song.id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline', song.artist_id, 'practice'] });
      toast({
        title: 'Status updated',
        description: 'Your practice status has been saved'
      });
      onToggleExpand();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive'
      });
    }
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return await artistsService.updatePipelineStatus(song.artist_id, song.id, newStatus);
    },
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline', song.artist_id] });
      const labels: Record<string, string> = {
        playbook: 'Playbook',
        parked: 'Parked',
        discarded: 'Discarded'
      };
      toast({
        title: 'Status changed',
        description: `Song moved to ${labels[newStatus]}`
      });
    }
  });

  const handleDiscard = async () => {
    const confirmed = await confirm({
      title: 'Discard this song?',
      description: 'This will archive the song. You can restore it later.'
    });
    if (confirmed) {
      statusMutation.mutate('discarded');
    }
  };

  return (
    <>
      <div
        className={`
          rounded-lg overflow-hidden transition-all
          ${needsRagStatus
            ? 'border-2 border-orange-500 shadow-lg shadow-orange-500/20'
            : 'border border-border'
          }
        `}
      >
        {/* Collapsed Card */}
        <div
          className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={!isExpanded ? onToggleExpand : undefined}
        >
          <div className="flex gap-3">
            {/* RAG Strip */}
            <RagStrip
              ragStatus={song.rag_status || {}}
              memberCount={memberCount}
              currentUserId={userId}
            />

            {/* Album Art */}
            <div className="flex-shrink-0">
              {song.globalSong.thumbnail_url ? (
                <img
                  src={song.globalSong.thumbnail_url}
                  alt={song.globalSong.title}
                  className="w-12 h-12 rounded object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                  <i className="fas fa-music text-muted-foreground"></i>
                </div>
              )}
            </div>

            {/* Song Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate">
                {song.globalSong.title}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {song.globalSong.artist_name}
              </p>
              {userRagStatus && (
                <span className={`text-xs font-medium ${
                  userRagStatus === 'RED' ? 'text-red-500' :
                  userRagStatus === 'AMBER' ? 'text-amber-500' :
                  'text-green-500'
                }`}>
                  Your status: {userRagStatus}
                </span>
              )}
            </div>

            {/* Update Button */}
            {!isExpanded && (
              <div className="flex-shrink-0 flex items-center">
                <button
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-all text-sm
                    ${needsRagStatus
                      ? 'bg-orange-500 text-white hover:bg-orange-600 animate-pulse'
                      : 'bg-primary/20 text-primary hover:bg-primary/30'
                    }
                  `}
                >
                  {needsRagStatus ? 'SET STATUS' : 'Update'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="p-4 border-t border-border bg-card space-y-4">
            {/* RAG Status Controls */}
            <RagStatusControls
              currentStatus={userRagStatus}
              onChange={(status) => ragMutation.mutate(status)}
            />

            {/* Song Actions */}
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">Song Actions</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => statusMutation.mutate('playbook')}
                  disabled={statusMutation.isPending}
                  className="p-3 rounded-lg bg-primary/20 hover:bg-primary/30 transition-all flex flex-col items-center gap-2"
                >
                  <i className="fas fa-check-circle text-primary text-xl"></i>
                  <span className="text-xs font-medium text-primary">Playbook</span>
                </button>

                <button
                  onClick={() => statusMutation.mutate('parked')}
                  disabled={statusMutation.isPending}
                  className="p-3 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 transition-all flex flex-col items-center gap-2"
                >
                  <i className="fas fa-pause-circle text-blue-500 text-xl"></i>
                  <span className="text-xs font-medium text-blue-500">Park</span>
                </button>

                <button
                  onClick={handleDiscard}
                  disabled={statusMutation.isPending}
                  className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-all flex flex-col items-center gap-2"
                >
                  <i className="fas fa-times-circle text-muted-foreground text-xl"></i>
                  <span className="text-xs font-medium text-muted-foreground">Discard</span>
                </button>
              </div>
            </div>

            {/* Cancel */}
            <button
              onClick={onToggleExpand}
              className="w-full px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog />
    </>
  );
}
