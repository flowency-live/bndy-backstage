import { Download, Calendar, List, Users, User, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCalendarExport } from '../hooks/useCalendarExport';

interface CalendarControlsProps {
  artistId?: string | null;
  viewMode: 'calendar' | 'agenda';
  onViewModeChange: (mode: 'calendar' | 'agenda') => void;
  showArtistEvents: boolean;
  onShowArtistEventsChange: (show: boolean) => void;
  showMyEvents: boolean;
  onShowMyEventsChange: (show: boolean) => void;
  showAllArtists: boolean;
  onShowAllArtistsChange: (show: boolean) => void;
  hasMultipleArtists?: boolean;
  onGetSubscriptionUrl?: () => void;
}

/**
 * Calendar controls component
 * Provides export menu, view mode toggle, and filter toggles
 */
export function CalendarControls({
  artistId,
  viewMode,
  onViewModeChange,
  showArtistEvents,
  onShowArtistEventsChange,
  showMyEvents,
  onShowMyEventsChange,
  showAllArtists,
  onShowAllArtistsChange,
  hasMultipleArtists = false,
  onGetSubscriptionUrl,
}: CalendarControlsProps) {
  const {
    exportAllPublic,
    exportPersonalAll,
    exportPersonalPublic,
    isExporting,
  } = useCalendarExport({ artistId });

  return (
    <div className="bg-card/80 backdrop-blur-sm border-b border-border p-2 md:p-4">
      <div className="flex items-center justify-between">
        {/* Export Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 md:gap-2 h-8 px-2 md:px-3"
              disabled={isExporting}
              data-testid="button-calendar-export"
            >
              <Download className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start">
            <DropdownMenuItem
              onClick={exportAllPublic}
              data-testid="menu-export-all-public"
            >
              <Calendar className="mr-2 w-4 h-4" />
              Export All Public Events
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={exportPersonalAll}
              data-testid="menu-export-personal-all"
            >
              <User className="mr-2 w-4 h-4" />
              Export My Events (All)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={exportPersonalPublic}
              data-testid="menu-export-personal-public"
            >
              <User className="mr-2 w-4 h-4" />
              Export My Public Events
            </DropdownMenuItem>
            {onGetSubscriptionUrl && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onGetSubscriptionUrl}
                  data-testid="menu-get-calendar-urls"
                >
                  <i className="fas fa-link mr-2 w-4 h-4"></i>
                  Get Subscription URL
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View Mode Toggle */}
        <div className="flex bg-muted rounded-lg p-0.5 md:p-1">
          <button
            onClick={() => onViewModeChange('calendar')}
            className={`px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm font-medium rounded transition-colors ${
              viewMode === 'calendar'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid="button-calendar-view"
          >
            <Calendar className="w-3 h-3 md:w-4 md:h-4 inline mr-1 md:mr-2" />
            <span className="hidden sm:inline">Calendar</span>
          </button>
          <button
            onClick={() => onViewModeChange('agenda')}
            className={`px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm font-medium rounded transition-colors ${
              viewMode === 'agenda'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid="button-agenda-view"
          >
            <List className="w-3 h-3 md:w-4 md:h-4 inline mr-1 md:mr-2" />
            <span className="hidden sm:inline">Agenda</span>
          </button>
        </div>
      </div>

      {/* Filter Toggles - Desktop */}
      <div className="hidden md:block mt-4">
        <div className="flex flex-wrap gap-2">
          {/* Artist Events Toggle */}
          {artistId && (
            <button
              onClick={() => onShowArtistEventsChange(!showArtistEvents)}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 shadow-sm
                ${
                  showArtistEvents
                    ? 'bg-brand-accent text-white border-brand-accent shadow-md'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 hover:shadow'
                }
              `}
              data-testid="toggle-artist-events"
            >
              <Users className="w-3 h-3 inline mr-2" />
              Artist Events
              {showArtistEvents && <i className="fas fa-check ml-2 text-xs"></i>}
            </button>
          )}

          {/* My Events Toggle */}
          <button
            onClick={() => onShowMyEventsChange(!showMyEvents)}
            className={`
              px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 shadow-sm
              ${
                showMyEvents
                  ? 'bg-cyan-500 text-white border-cyan-500 shadow-md'
                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 hover:shadow'
              }
            `}
            data-testid="toggle-my-events"
          >
            <User className="w-3 h-3 inline mr-2" />
            My Events
            {showMyEvents && <i className="fas fa-check ml-2 text-xs"></i>}
          </button>

          {/* All Artists Toggle - only show when in artist context AND user has multiple artists AND artist events is enabled */}
          {artistId && hasMultipleArtists && showArtistEvents && (
            <button
              onClick={() => onShowAllArtistsChange(!showAllArtists)}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 shadow-sm
                ${
                  showAllArtists
                    ? 'bg-purple-500 text-white border-purple-500 shadow-md'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 hover:shadow'
                }
              `}
              data-testid="toggle-all-artists"
            >
              <Layers className="w-3 h-3 inline mr-2" />
              All Artists
              {showAllArtists && <i className="fas fa-check ml-2 text-xs"></i>}
            </button>
          )}
        </div>
      </div>

      {/* Filter Toggles - Mobile (Icon only) */}
      <div className="md:hidden mt-2 flex justify-center gap-2">
        {/* Artist Events Toggle - Icon only on mobile */}
        {artistId && (
          <button
            onClick={() => onShowArtistEventsChange(!showArtistEvents)}
            className={`
              w-7 h-7 rounded-full text-xs font-medium border transition-all duration-200 flex items-center justify-center
              ${
                showArtistEvents
                  ? 'bg-brand-accent text-white border-brand-accent'
                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
              }
            `}
            data-testid="toggle-artist-events"
            title="Artist Events"
          >
            <Users className="w-3 h-3" />
          </button>
        )}

        {/* My Events Toggle - Icon only on mobile */}
        <button
          onClick={() => onShowMyEventsChange(!showMyEvents)}
          className={`
            w-7 h-7 rounded-full text-xs font-medium border transition-all duration-200 flex items-center justify-center
            ${
              showMyEvents
                ? 'bg-cyan-500 text-white border-cyan-500'
                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
            }
          `}
          data-testid="toggle-my-events"
          title="My Events"
        >
          <User className="w-3 h-3" />
        </button>

        {/* All Artists Toggle - Icon only on mobile */}
        {artistId && hasMultipleArtists && showArtistEvents && (
          <button
            onClick={() => onShowAllArtistsChange(!showAllArtists)}
            className={`
              w-7 h-7 rounded-full text-xs font-medium border transition-all duration-200 flex items-center justify-center
              ${
                showAllArtists
                  ? 'bg-purple-500 text-white border-purple-500'
                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
              }
            `}
            data-testid="toggle-all-artists"
            title="All Artists"
          >
            <Layers className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
