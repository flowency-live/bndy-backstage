import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerAuth } from "@/hooks/useServerAuth";
import PracticeSongCard from "./cards/practice-song-card";
import { artistsService } from "@/lib/services/artists-service";
import type { ArtistMembership, Artist } from "@/types/api";

interface PracticeTabProps {
  artistId: string;
  membership: ArtistMembership & { artist: Artist };
}

interface PipelineSong {
  id: string;
  artist_id: string;
  song_id: string;
  status: string;
  rag_status: Record<string, { status: string; updated_at: string }>;
  created_at: string;
  globalSong: {
    id: string;
    title: string;
    artist_name: string;
    album: string;
    thumbnail_url?: string;
  };
}

type GroupByOption = 'status' | 'artist' | 'alpha' | 'date';

export default function PracticeTab({ artistId, membership }: PracticeTabProps) {
  const { session } = useServerAuth();
  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupByOption>('status');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const { data: songs = [], isLoading } = useQuery({
    queryKey: ['pipeline', artistId, 'practice'],
    queryFn: async () => {
      return await artistsService.getPipelineSongs(artistId, 'practice');
    },
    refetchInterval: 30000
  });

  // TODO: Get actual member count from membership prop/context
  const memberCount = 1;

  // Sort: needs RAG status first
  const sortedSongs = [...songs].sort((a: PipelineSong, b: PipelineSong) => {
    const aHasRag = a.rag_status?.[session?.user?.id];
    const bHasRag = b.rag_status?.[session?.user?.id];

    if (!aHasRag && bHasRag) return -1;
    if (aHasRag && !bHasRag) return 1;
    return 0;
  });

  const toggleGroup = (group: string) => {
    setCollapsed(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // Group songs by status (needs action vs has status)
  const groupByStatus = (): Record<string, PipelineSong[]> => {
    const needsAction: PipelineSong[] = [];
    const hasStatus: PipelineSong[] = [];

    sortedSongs.forEach((song: PipelineSong) => {
      const hasRag = song.rag_status?.[session?.user?.id];
      if (hasRag) {
        hasStatus.push(song);
      } else {
        needsAction.push(song);
      }
    });

    const groups: Record<string, PipelineSong[]> = {};
    if (needsAction.length > 0) groups['Set Your Status'] = needsAction;
    if (hasStatus.length > 0) groups['Status Set'] = hasStatus;
    return groups;
  };

  // Alternative grouping (artist, alpha, date)
  const getAlternativeGroups = (): Record<string, PipelineSong[]> => {
    return sortedSongs.reduce((acc: Record<string, PipelineSong[]>, song: PipelineSong) => {
      let groupKey: string;

      if (groupBy === 'artist') {
        groupKey = song.globalSong.artist_name || 'Unknown Artist';
      } else if (groupBy === 'alpha') {
        const firstLetter = song.globalSong.title.charAt(0).toUpperCase();
        groupKey = /[A-Z]/.test(firstLetter) ? firstLetter : '#';
      } else {
        // date - group by month/year
        const date = new Date(song.created_at);
        groupKey = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      }

      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(song);
      return acc;
    }, {});
  };

  const groups = groupBy === 'status' ? groupByStatus() : getAlternativeGroups();
  const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
    if (groupBy === 'status') {
      // Keep "Set Your Status" first
      if (a === 'Set Your Status') return -1;
      if (b === 'Set Your Status') return 1;
      return 0;
    }
    if (groupBy === 'date') {
      return new Date(b).getTime() - new Date(a).getTime();
    }
    return a.localeCompare(b);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-3xl text-muted-foreground mb-2"></i>
          <p className="text-muted-foreground">Loading songs...</p>
        </div>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4 opacity-60">🎸</div>
        <h3 className="text-lg font-semibold mb-2">No songs in practice</h3>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          Songs appear here when the band votes to practice them.
        </p>
      </div>
    );
  }

  const groupByOptions: { value: GroupByOption; label: string; icon: string }[] = [
    { value: 'status', label: 'Status', icon: 'fa-tasks' },
    { value: 'artist', label: 'Artist', icon: 'fa-user' },
    { value: 'alpha', label: 'A-Z', icon: 'fa-sort-alpha-down' },
    { value: 'date', label: 'Date', icon: 'fa-calendar' },
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Grouping Controls */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        {groupByOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setGroupBy(option.value)}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              groupBy === option.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <i className={`fas ${option.icon} mr-1.5`}></i>
            {option.label}
          </button>
        ))}
      </div>

      {/* Grouped songs */}
      {sortedGroupKeys.map((groupKey) => (
        <div key={groupKey}>
          <button
            onClick={() => toggleGroup(groupKey)}
            className="mb-3 w-full flex items-center gap-2 group cursor-pointer"
          >
            <div className="flex-1 h-px bg-border"></div>
            <h3 className={`text-sm font-semibold uppercase tracking-wide flex items-center gap-2 ${
              groupKey === 'Set Your Status' ? 'text-orange-500' : 'text-foreground'
            }`}>
              <i className={`fas fa-chevron-${collapsed[groupKey] ? 'right' : 'down'} text-xs transition-transform`}></i>
              {groupKey === 'Set Your Status' && <i className="fas fa-exclamation-circle"></i>}
              {groupKey} ({groups[groupKey].length})
            </h3>
            <div className="flex-1 h-px bg-border"></div>
          </button>
          {!collapsed[groupKey] && (
            <div className="space-y-3">
              {groups[groupKey].map((song: PipelineSong) => (
                <PracticeSongCard
                  key={song.id}
                  song={song}
                  userId={session?.user?.id || ''}
                  memberCount={memberCount}
                  isExpanded={expandedSongId === song.id}
                  onToggleExpand={() => setExpandedSongId(expandedSongId === song.id ? null : song.id)}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
