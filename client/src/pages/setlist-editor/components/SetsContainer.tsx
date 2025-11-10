/**
 * SetsContainer - Container for all sets with scroll gutter indicator
 */

import type { SetlistSet } from '../types';
import { SetCard } from './SetCard';

export interface SetsContainerProps {
  sets: SetlistSet[];
  drawerOpen: boolean;
  collapsedSets: Set<string>;
  activeSetId: string;
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

export function SetsContainer({
  sets,
  drawerOpen,
  collapsedSets,
  activeSetId,
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
}: SetsContainerProps) {
  return (
    <div className={`transition-all duration-300 ${drawerOpen ? 'w-1/2 lg:flex-1' : 'w-full lg:flex-1'} min-w-0 relative`}>
      {/* Scroll gutter on mobile - visual indicator on right side - only show when drawer closed */}
      {!drawerOpen && (
        <div className="lg:hidden absolute top-0 right-0 bottom-0 w-12 pointer-events-auto z-20 bg-gradient-to-l from-muted/20 to-transparent border-l border-border/50" style={{ touchAction: 'pan-y' }}>
          <div className="flex items-center justify-center h-full opacity-40">
            <i className="fas fa-grip-lines-vertical text-muted-foreground"></i>
          </div>
        </div>
      )}
      <div className={`space-y-6 ${drawerOpen ? '' : 'pr-12'} lg:pr-0`}>
        {sets.map((set) => {
          const isCollapsed = collapsedSets.has(set.id);
          const isActive = activeSetId === set.id;

          return (
            <SetCard
              key={set.id}
              set={set}
              isCollapsed={isCollapsed}
              isActive={isActive}
              drawerOpen={drawerOpen}
              overId={overId}
              editingSongTitle={editingSongTitle}
              tempSongTitle={tempSongTitle}
              onToggleCollapse={onToggleCollapse}
              onSetActive={onSetActive}
              onToggleSegue={onToggleSegue}
              onRemoveSong={onRemoveSong}
              onStartEditSongTitle={onStartEditSongTitle}
              onEditSongTitleChange={onEditSongTitleChange}
              onFinishEditSongTitle={onFinishEditSongTitle}
            />
          );
        })}
      </div>
    </div>
  );
}
