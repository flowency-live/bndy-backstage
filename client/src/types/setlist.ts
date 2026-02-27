/**
 * Setlist Type Definitions
 * Shared types for setlist feature across all components
 */

export interface SetlistSong {
  /** Unique instance ID for this song in the set */
  id: string;
  /** Type discriminator */
  type?: 'song';
  /** Reference to the playbook song ID */
  song_id: string;
  /** Song title */
  title: string;
  /** Artist name */
  artist: string;
  /** Duration in seconds - REQUIRED */
  duration: number;
  /** Custom duration override in seconds */
  custom_duration?: number;
  /** Position in the set (0-indexed) */
  position: number;
  /** Song key */
  key?: string;
  /** Guitar tuning */
  tuning?: string;
  /** Performance notes from playbook */
  notes?: string;
  /** Whether this song segues into the next */
  segueInto?: boolean;
  /** Album artwork URL */
  imageUrl?: string;
}

/** Break line between songs (e.g., guitar retune, instrument swap) */
export interface SetlistBreak {
  /** Unique instance ID for this break in the set */
  id: string;
  /** Type discriminator */
  type: 'break';
  /** Break note (e.g., "Guitar retune to Drop D") */
  note: string;
  /** Position in the set (0-indexed) */
  position: number;
}

/** Union type for items in a set (songs or breaks) */
export type SetlistItem = SetlistSong | SetlistBreak;

/** Type guard to check if item is a song */
export function isSetlistSong(item: SetlistItem): item is SetlistSong {
  return item.type === 'song' || !('type' in item) || item.type === undefined;
}

/** Type guard to check if item is a break */
export function isSetlistBreak(item: SetlistItem): item is SetlistBreak {
  return item.type === 'break';
}

export interface SetlistSet {
  /** Unique set ID */
  id: string;
  /** Set name (e.g., "Set 1", "Encore") */
  name: string;
  /** Target duration in seconds */
  targetDuration: number;
  /** Items in this set (songs and breaks) */
  songs: SetlistItem[];
}

export interface Setlist {
  /** Unique setlist ID */
  id: string;
  /** Artist/band ID */
  artist_id: string;
  /** Setlist name */
  name: string;
  /** Sets in this setlist */
  sets: SetlistSet[];
  /** Membership ID of creator */
  created_by_membership_id?: string;
  /** ISO timestamp */
  created_at: string;
  /** ISO timestamp */
  updated_at: string;
}

export interface PlaybookSong {
  /** Playbook song ID */
  id: string;
  /** Spotify track ID */
  spotifyId: string;
  /** Song title */
  title: string;
  /** Artist name */
  artist: string;
  /** Album name */
  album: string;
  /** Spotify URL */
  spotifyUrl: string;
  /** Album artwork URL */
  imageUrl?: string;
  /** Duration in seconds - REQUIRED for setlist calculations */
  duration: number;
  /** Custom duration override in seconds */
  custom_duration?: number;
  /** Song key */
  key?: string;
  /** Guitar tuning */
  tuning?: string;
}
