/**
 * PlaybookDrawer - Virtualized playbook sidebar with search, filters, and song list
 * Uses @tanstack/react-virtual for efficient rendering of large song lists
 */

import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
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

type VirtualItem =
  | { type: 'header'; letter: string }
  | { type: 'song'; song: PlaybookSong };

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
  const parentRef = useRef<HTMLDivElement>(null);

  // Flatten grouped songs into a single list for virtualization
  const flattenedItems = useMemo<VirtualItem[]>(() => {
    const items: VirtualItem[] = [];
    for (const letter of sortedLetters) {
      items.push({ type: 'header', letter });
      for (const song of groupedSongs[letter]) {
        items.push({ type: 'song', song });
      }
    }
    return items;
  }, [sortedLetters, groupedSongs]);

  const virtualizer = useVirtualizer({
    count: flattenedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = flattenedItems[index];
      // Headers are smaller than song cards
      return item.type === 'header' ? 28 : 44;
    },
    overscan: 10,
  });

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

      <div
        ref={parentRef}
        className="p-2 h-[calc(100vh-220px)] lg:max-h-[600px] overflow-y-auto"
      >
        {sortedLetters.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            {searchQuery ? 'No songs found' : 'No songs available'}
          </div>
        )}
        {sortedLetters.length > 0 && (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const item = flattenedItems[virtualRow.index];

              if (item.type === 'header') {
                return (
                  <div
                    key={`header-${item.letter}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div className="sticky top-0 bg-muted/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-foreground z-10 pointer-events-none">
                      {item.letter}
                    </div>
                  </div>
                );
              }

              const song = item.song;
              const isInSetlist = songsInSetlist.has(song.id);

              return (
                <div
                  key={song.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    padding: '2px 0',
                  }}
                >
                  <DraggablePlaybookSong
                    song={song}
                    isInSetlist={isInSetlist}
                    onQuickAdd={onQuickAdd}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
