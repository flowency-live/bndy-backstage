import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;      // Primary action buttons (Add Venue, Add Song, etc.)
  tabs?: ReactNode;         // Tab navigation (Playbook/Setlists, Voting/Practice, etc.)
  filters?: ReactNode;      // Filter controls (pills, dropdowns, group-by)
  search?: ReactNode;       // Search bar
  className?: string;
  showTitleOnMobile?: boolean;
}

/**
 * PageHeader - Standardized page header with consistent sticky layout
 *
 * **CONSISTENT LAYOUT PATTERN (ALL PAGES):**
 *
 * Desktop Title Section (hidden on mobile):
 * - Title + Subtitle
 *
 * STICKY SECTION (always visible, stays on scroll):
 * - Row 1: Tabs/Navigation + Primary Action Buttons
 * - Row 2: Filter Controls (if provided)
 * - Row 3: Search Bar (if provided)
 *
 * @example
 * ```tsx
 * // Venues pattern
 * <PageHeader
 *   title="Venues"
 *   subtitle="Manage your venue relationships"
 *   actions={<>
 *     <Button>List</Button>
 *     <Button>Map</Button>
 *     <Button>Add Venue</Button>
 *   </>}
 *   filters={<>
 *     <Button>All Venues</Button>
 *     <Button>With Gigs</Button>
 *     <Button>No Gigs Yet</Button>
 *   </>}
 *   search={<Input placeholder="Search venues..." />}
 * />
 *
 * // Playbook pattern
 * <PageHeader
 *   tabs={<>
 *     <TabButton>Playbook</TabButton>
 *     <TabButton>Setlists</TabButton>
 *     <Button>Add Song</Button>
 *   </>}
 *   filters={<>
 *     <Select>All Genres</Select>
 *     <Select>All Decades</Select>
 *     <Select>Group: A-Z</Select>
 *   </>}
 *   search={<Input placeholder="Search songs..." />}
 * />
 * ```
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  tabs,
  filters,
  search,
  className,
  showTitleOnMobile = false
}: PageHeaderProps) {
  return (
    <>
      {/* Title + Actions Row - Shows on mobile if showTitleOnMobile=true */}
      {title && (
        <div className={cn(
          'flex items-center justify-between gap-4 mb-6',
          !showTitleOnMobile && 'hidden sm:flex',
          className
        )}>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {title}
          </h1>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* STICKY CONTROL SECTION - All devices */}
      {(tabs || filters || search) && (
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pt-4 pb-4 mb-6 space-y-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          {/* Row 1: Tabs/Navigation */}
          {tabs && (
            <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
              <div className="flex-1">
                {tabs}
              </div>
            </div>
          )}

          {/* Row 2: Filter Controls */}
          {filters && (
            <div className="flex flex-wrap items-center gap-2">
              {filters}
            </div>
          )}

          {/* Row 3: Search Bar */}
          {search && (
            <div>
              {search}
            </div>
          )}
        </div>
      )}
    </>
  );
}
