/**
 * SortableSongCard - Individual song card in a set with drag, edit, and segue functionality
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SetlistSong } from '../types';
import { formatDuration } from '../utils';

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

export function SortableSongCard({
  song,
  setId,
  idx,
  onToggleSegue,
  onRemove,
  showSegue,
  isOver,
  drawerOpen,
  isEditing,
  editValue,
  onStartEdit,
  onEditChange,
  onFinishEdit,
  prevSongHasSegue,
}: SortableSongCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Segue connector - just the link icon overlapping cards */}
      {prevSongHasSegue && !isOver && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20">
          <div className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-background">
            <i className="fas fa-link text-[8px]"></i>
          </div>
        </div>
      )}
      {/* Insertion indicator - shows where drop will happen */}
      {isOver && (
        <div className="h-1 bg-orange-500 rounded-full mb-1 shadow-lg"></div>
      )}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center gap-1 sm:gap-2 bg-background border border-border rounded p-1 sm:p-2 hover:border-orange-500/50 transition-colors select-none cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      >
        {/* Position number */}
        <div className="w-5 sm:w-6 text-center text-xs sm:text-sm font-bold text-foreground shrink-0">
          {idx + 1}.
        </div>

        <div className="flex-1 min-w-0 group">
          {isEditing ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              onBlur={onFinishEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  onFinishEdit();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  onFinishEdit();
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="w-full px-1 py-0.5 text-xs border border-orange-500 rounded"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="flex items-center gap-1">
              <div className="font-medium truncate text-xs">{song.title}</div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEdit(song.id, song.title);
                }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-orange-500 shrink-0"
                title="Edit title"
              >
                <i className="fas fa-edit text-[10px]"></i>
              </button>
            </div>
          )}
        </div>
        {!drawerOpen && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap shrink-0">
            {song.tuning && song.tuning !== 'standard' && (
              <span className={`py-0.5 text-[10px] font-bold rounded shrink-0 whitespace-nowrap ${
                song.tuning === 'drop-d' ? 'bg-yellow-400 text-black px-1.5' :
                song.tuning === 'eb' ? 'bg-blue-500 text-white px-2' :
                'bg-gray-400 text-black px-1.5'
              }`}>
                {song.tuning === 'drop-d' ? '↓D' : song.tuning === 'eb' ? 'E♭' : song.tuning.toUpperCase()}
              </span>
            )}
            <span>{(song.custom_duration || song.duration) ? formatDuration(song.custom_duration || song.duration) : '0:00'}</span>
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSegue(setId, song.id);
          }}
          className={`p-0.5 sm:p-1 ${song.segueInto ? 'text-blue-500' : 'text-muted-foreground'} hover:text-blue-600 shrink-0`}
          title={song.segueInto ? 'Click to break segue' : 'Click to segue into next song'}
        >
          <i className="fas fa-arrow-down text-xs"></i>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(setId, song.id);
          }}
          className="text-red-500 hover:text-red-600 p-0.5 sm:p-1 shrink-0"
        >
          <i className="fas fa-times text-xs"></i>
        </button>
      </div>
    </div>
  );
}
