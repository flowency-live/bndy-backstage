/**
 * DraggablePlaybookSong - Draggable song card from playbook with quick-add functionality
 */

import { useDraggable } from '@dnd-kit/core';
import type { PlaybookSong } from '../types';

export interface DraggablePlaybookSongProps {
  song: PlaybookSong;
  isInSetlist: boolean;
  onQuickAdd: (songId: string, e: React.MouseEvent) => void;
}

export function DraggablePlaybookSong({ song, isInSetlist, onQuickAdd }: DraggablePlaybookSongProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: `playbook-${song.id}` });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  const combinedStyle = {
    ...style,
    touchAction: 'none' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={combinedStyle}
      {...attributes}
      {...listeners}
      onClick={(e) => onQuickAdd(song.id, e)}
      className={`flex items-center gap-1 sm:gap-2 bg-background border rounded p-1 sm:p-2 transition-colors select-none ${
        isInSetlist
          ? 'border-green-500/30 opacity-60'
          : 'border-border hover:border-orange-500/50 cursor-pointer lg:cursor-grab active:cursor-grabbing'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <div className="font-medium truncate text-xs">{song.title}</div>
          {song.tuning && song.tuning !== 'standard' && (
            <span className={`py-0.5 text-[10px] font-bold rounded shrink-0 whitespace-nowrap ${
              song.tuning === 'drop-d' ? 'bg-yellow-400 text-black px-1.5' :
              song.tuning === 'eb' ? 'bg-blue-500 text-white px-2' :
              'bg-gray-400 text-black px-1.5'
            }`}>
              {song.tuning === 'drop-d' ? '↓D' : song.tuning === 'eb' ? 'E♭' : song.tuning.toUpperCase()}
            </span>
          )}
          {isInSetlist && (
            <i className="fas fa-check text-green-500 text-xs shrink-0" title="Already in setlist"></i>
          )}
        </div>
      </div>
    </div>
  );
}
