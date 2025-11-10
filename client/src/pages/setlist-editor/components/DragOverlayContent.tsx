/**
 * DragOverlayContent - Visual overlay shown during drag operations
 */

import type { PlaybookSong, Setlist } from '../types';

export interface DragOverlayContentProps {
  activeId: string | null;
  playbookSongs: PlaybookSong[];
  setlist: Setlist | null;
}

export function DragOverlayContent({ activeId, playbookSongs, setlist }: DragOverlayContentProps) {
  if (!activeId) return null;

  // Find the active song being dragged
  let songTitle = 'Song';

  if (activeId.startsWith('playbook-')) {
    const songId = activeId.replace('playbook-', '');
    const song = playbookSongs.find(s => s.id === songId);
    if (song) songTitle = song.title;
  } else {
    // Find in setlist songs
    for (const set of setlist?.sets || []) {
      const song = set.songs.find(s => s.id === activeId);
      if (song) {
        songTitle = song.title;
        break;
      }
    }
  }

  return (
    <div
      className="flex items-center gap-2 bg-orange-500 text-white border-2 border-orange-600 rounded p-3 shadow-2xl"
      style={{
        cursor: 'grabbing',
        position: 'fixed',
        zIndex: 9999,
        pointerEvents: 'none',
        touchAction: 'none',
      }}
    >
      <i className="fas fa-grip-vertical text-sm"></i>
      <div className="font-bold text-sm">{songTitle}</div>
    </div>
  );
}
