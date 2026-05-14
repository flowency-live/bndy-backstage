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
  dimmed?: boolean;
}

export default function PracticeSongCard({
  song,
  userId,
  memberCount,
  isExpanded,
  onToggleExpand,
  dimmed = false
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
      <div className={`bg-card rounded-lg overflow-hidden border transition-all duration-200 ${
        isExpanded
          ? 'border-primary shadow-lg ring-2 ring-primary/20 relative z-10'
          : dimmed
            ? 'border-border opacity-40 blur-[1px] pointer-events-none'
            : 'border-border hover:shadow-md hover:-translate-y-0.5'
      }`}>
        {/* Collapsed Card - edge-to-edge layout */}
        <div
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={!isExpanded ? onToggleExpand : undefined}
        >
          <div className="flex items-center">
            {/* RAG Strip */}
            <RagStrip
              ragStatus={song.rag_status || {}}
              memberCount={memberCount}
              currentUserId={userId}
            />

            {/* Album Art - flush after RAG strip */}
            <div className="w-12 h-12 flex-shrink-0 overflow-hidden">
              {song.globalSong.thumbnail_url ? (
                <img
                  src={song.globalSong.thumbnail_url}
                  alt={song.globalSong.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <i className="fas fa-music text-muted-foreground text-sm"></i>
                </div>
              )}
            </div>

            {/* Song Info - ensure readable width */}
            <div className="flex-1 min-w-0 px-3 py-2">
              <h3 className="font-semibold text-sm text-foreground truncate tracking-tight">
                {song.globalSong.title}
              </h3>
              <p className="text-xs text-muted-foreground/80 truncate">
                {song.globalSong.artist_name}
              </p>
            </div>

            {/* Status & Expand - RAG badge on right */}
            <div className="flex items-center gap-1.5 pr-2 flex-shrink-0">
              {/* Status badges - only when collapsed */}
              {!isExpanded && (
                <>
                  {userRagStatus && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      userRagStatus === 'RED' ? 'bg-red-500/20 text-red-500' :
                      userRagStatus === 'AMBER' ? 'bg-amber-500/20 text-amber-500' :
                      'bg-green-500/20 text-green-500'
                    }`}>
                      {userRagStatus}
                    </span>
                  )}
                  {needsRagStatus && (
                    <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" title="Set your status" />
                  )}
                </>
              )}
              {/* Chevron - ALWAYS visible */}
              <button
                onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
                className="p-1 hover:bg-muted rounded"
              >
                <i className={`fas fa-chevron-down text-muted-foreground text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}></i>
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-border bg-muted/30 overflow-hidden animate-expand">
            <div className="p-4 space-y-4 animate-fade-in-up">
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
          </div>
        )}
      </div>

      <ConfirmDialog />
    </>
  );
}
