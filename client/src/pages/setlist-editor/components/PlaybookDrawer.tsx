/**
 * PlaybookDrawer - Playbook sidebar with search, filters, and song list
 */

import type { PlaybookSong } from '../types';
import { DraggablePlaybookSong } from './DraggablePlaybookSong';

export interface PlaybookDrawerProps {
  drawerOpen: boolean;
  searchQuery: string;
  showAllSongs: boolean;
  sortedLetters: string[];
  groupedSongs: Record<string, PlaybookSong[]>;
  songsInSetlist: Set<string>;
  onToggleDrawer: () => void;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onShowAllChange: (checked: boolean) => void;
  onQuickAdd: (songId: string, e: React.MouseEvent) => void;
}

export function PlaybookDrawer({
  drawerOpen,
  searchQuery,
  showAllSongs,
  sortedLetters,
  groupedSongs,
  songsInSetlist,
  onToggleDrawer,
  onSearchChange,
  onClearSearch,
  onShowAllChange,
  onQuickAdd,
}: PlaybookDrawerProps) {
  return (
    <div className={`transition-all duration-300 ${
      drawerOpen ? 'w-1/2 lg:w-80' : 'w-0 lg:w-80'
    } ${drawerOpen ? 'block' : 'hidden lg:block'} bg-card border-l border-border overflow-hidden`}>
      <div className="bg-orange-500 text-white p-2 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Playbook</h3>
          <p className="text-xs opacity-90 lg:block hidden">Drag or tap to add</p>
          <p className="text-xs opacity-90 lg:hidden">Tap to add to active set</p>
        </div>
        <button
          onClick={onToggleDrawer}
          className="lg:hidden text-white hover:bg-orange-600 p-2 rounded"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="p-2 border-b space-y-2">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search songs..."
            className="w-full px-2 py-1.5 pr-7 text-sm border border-border bg-background rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          {searchQuery && (
            <button
              onClick={onClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              title="Clear search"
            >
              <i className="fas fa-times text-xs"></i>
            </button>
          )}
        </div>
        <label className="flex items-center space-x-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showAllSongs}
            onChange={(e) => onShowAllChange(e.target.checked)}
            className="w-4 h-4 text-orange-500 focus:ring-orange-500 rounded"
          />
          <span className="text-foreground">Show songs already in setlist</span>
        </label>
      </div>

      <div className="p-2 h-[calc(100vh-220px)] lg:max-h-[600px] overflow-y-auto">
        {sortedLetters.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            {searchQuery ? 'No songs found' : 'No songs available'}
          </div>
        )}
        {sortedLetters.map((letter) => (
          <div key={letter} className="mb-3">
            {/* Letter header - sticky */}
            <div className="sticky top-0 bg-muted/90 backdrop-blur-sm px-2 py-1 mb-1 rounded text-xs font-bold text-foreground z-10 pointer-events-none">
              {letter}
            </div>
            {/* Songs in this letter group */}
            <div className="space-y-1">
              {groupedSongs[letter].map((song) => {
                const isInSetlist = songsInSetlist.has(song.id);
                return (
                  <DraggablePlaybookSong
                    key={song.id}
                    song={song}
                    isInSetlist={isInSetlist}
                    onQuickAdd={onQuickAdd}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
