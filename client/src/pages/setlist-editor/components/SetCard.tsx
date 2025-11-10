/**
 * SetCard - Individual set card with header, duration, and song list
 */

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { SetlistSet, SetlistSong } from '../types';
import { formatDuration, getDurationVariance, getVarianceColor } from '../utils';
import { SortableSongCard } from './SortableSongCard';
import { DroppableSetContainer } from './DroppableSetContainer';

export interface SetCardProps {
  set: SetlistSet;
  isCollapsed: boolean;
  isActive: boolean;
  drawerOpen: boolean;
  overId: string | null;
  editingSongTitle: string | null;
  tempSongTitle: string;
  onToggleCollapse: (setId: string) => void;
  onSetActive: (setId: string) => void;
  onToggleSegue: (setId: string, songId: string) => void;
  onRemoveSong: (setId: string, songId: string) => void;
  onStartEditSongTitle: (songId: string, currentTitle: string) => void;
  onEditSongTitleChange: (value: string) => void;
  onFinishEditSongTitle: () => void;
}

export function SetCard({
  set,
  isCollapsed,
  isActive,
  drawerOpen,
  overId,
  editingSongTitle,
  tempSongTitle,
  onToggleCollapse,
  onSetActive,
  onToggleSegue,
  onRemoveSong,
  onStartEditSongTitle,
  onEditSongTitleChange,
  onFinishEditSongTitle,
}: SetCardProps) {
  const totalDuration = set.songs.reduce((sum, song) => sum + (song?.duration || 0), 0);
  const variance = getDurationVariance(totalDuration, set.targetDuration);
  const varianceColor = getVarianceColor(variance);

  return (
    <div className="bg-card border-y sm:border sm:rounded border-border overflow-hidden">
      {/* Set header - compact mobile-first design */}
      <div className="bg-muted/30 px-1 py-1.5 sm:p-3 border-b border-border">
        {/* Mobile layout - single line with everything */}
        <div className="flex items-center gap-1 sm:hidden text-xs">
          <input
            type="radio"
            name="activeSet"
            checked={isActive}
            onChange={() => onSetActive(set.id)}
            className="w-3.5 h-3.5 text-orange-500 focus:ring-orange-500 cursor-pointer shrink-0"
          />
          <h3 className="font-semibold whitespace-nowrap">{set.name}</h3>
          <span className="text-muted-foreground whitespace-nowrap">({set.songs.length})</span>
          <div className={`ml-auto flex items-center gap-1 font-medium ${varianceColor} shrink-0`}>
            <span className="whitespace-nowrap">{formatDuration(totalDuration)}/{formatDuration(set.targetDuration)}</span>
            <span className="whitespace-nowrap">({variance > 0 ? '+' : ''}{variance.toFixed(0)}%)</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(set.id);
            }}
            className="text-muted-foreground hover:text-foreground p-1 transition-colors shrink-0 ml-0.5"
          >
            <i className={`fas fa-chevron-${isCollapsed ? 'down' : 'up'} text-sm`}></i>
          </button>
        </div>

        {/* Desktop layout - horizontal */}
        <div className="hidden sm:flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              name="activeSet"
              checked={isActive}
              onChange={() => onSetActive(set.id)}
              className="w-4 h-4 text-orange-500 focus:ring-orange-500 cursor-pointer"
            />
            <h3 className="font-semibold">{set.name}</h3>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`font-medium ${varianceColor}`}>
              {formatDuration(totalDuration)} / {formatDuration(set.targetDuration)}
              <span className="ml-1">({variance > 0 ? '+' : ''}{variance.toFixed(0)}%)</span>
            </div>
            <span className="text-muted-foreground">
              {set.songs.length} song{set.songs.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse(set.id);
              }}
              className="text-muted-foreground hover:text-foreground p-1 transition-colors"
            >
              <i className={`fas fa-chevron-${isCollapsed ? 'down' : 'up'}`}></i>
            </button>
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <SortableContext
          items={set.songs.map(s => s.id)}
          strategy={verticalListSortingStrategy}
          id={`set-container-${set.id}`}
        >
          <DroppableSetContainer setId={set.id}>
            {set.songs?.map((song, idx) => {
              const prevSongHasSegue = idx > 0 && set.songs[idx - 1]?.segueInto;
              return (
                <SortableSongCard
                  key={song.id}
                  song={song}
                  setId={set.id}
                  idx={idx}
                  onToggleSegue={onToggleSegue}
                  onRemove={onRemoveSong}
                  showSegue={song.segueInto && idx < set.songs.length - 1}
                  isOver={overId === song.id}
                  drawerOpen={drawerOpen}
                  isEditing={editingSongTitle === song.id}
                  editValue={tempSongTitle}
                  onStartEdit={onStartEditSongTitle}
                  onEditChange={onEditSongTitleChange}
                  onFinishEdit={onFinishEditSongTitle}
                  prevSongHasSegue={prevSongHasSegue}
                />
              );
            })}
            {set.songs.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                Drag songs here
              </div>
            )}
          </DroppableSetContainer>
        </SortableContext>
      )}
    </div>
  );
}
