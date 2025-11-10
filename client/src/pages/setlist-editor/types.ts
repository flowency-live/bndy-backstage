import type { ArtistMembership, Artist } from "@/types/api";
import type { Setlist, SetlistSet, SetlistSong, PlaybookSong } from "@/types/setlist";

// Main editor props
export interface SetlistEditorProps {
  artistId: string;
  setlistId: string;
  membership: ArtistMembership & { artist: Artist };
}

// Component prop types
export interface SortableSongCardProps {
  song: SetlistSong;
  setId: string;
  idx: number;
  onToggleSegue: (setId: string, songId: string) => void;
  onRemove: (setId: string, songId: string) => void;
  showSegue: boolean;
  isOver: boolean;
  drawerOpen: boolean;
  isEditing: boolean;
  editValue: string;
  onStartEdit: (songId: string, currentTitle: string) => void;
  onEditChange: (value: string) => void;
  onFinishEdit: () => void;
  prevSongHasSegue?: boolean;
}

export interface DraggablePlaybookSongProps {
  song: PlaybookSong;
  isInSetlist: boolean;
  onQuickAdd: (songId: string, e: React.MouseEvent) => void;
}

export interface DroppableSetContainerProps {
  setId: string;
  children: React.ReactNode;
}

// Re-export types from central location for convenience
export type {
  Setlist,
  SetlistSet,
  SetlistSong,
  PlaybookSong,
  ArtistMembership,
  Artist,
};
