import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  tabs?: ReactNode;
  className?: string;
  showTitleOnMobile?: boolean;
}

/**
 * PageHeader - Standardized page header component
 *
 * Provides consistent page titles, subtitles, actions, and tab navigation.
 *
 * **Mobile-First Behavior:**
 * - By default, hides title on mobile (context from tabs/content)
 * - Always shows tabs if provided
 * - Can override with `showTitleOnMobile={true}` for special cases
 *
 * @param title - Page title (hidden on mobile by default)
 * @param subtitle - Optional descriptive text below title
 * @param actions - Action buttons (e.g., "Add New" button)
 * @param tabs - Tab navigation component
 * @param showTitleOnMobile - Override to show title on mobile (default: false)
 *
 * @example
 * ```tsx
 * // Title hidden on mobile, tabs visible
 * <PageHeader
 *   title="Venues"
 *   subtitle="Manage your venue relationships"
 *   actions={<Button>Add Venue</Button>}
 * />
 *
 * // Tabs only (no title)
 * <PageHeader
 *   tabs={<TabNavigation />}
 * />
 *
 * // Force title on mobile
 * <PageHeader
 *   title="Profile"
 *   showTitleOnMobile={true}
 * />
 * ```
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  tabs,
  className,
  showTitleOnMobile = false
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      {title && (
        <div className={cn(
          'flex items-center justify-between mb-4',
          !showTitleOnMobile && 'hidden sm:flex'
        )}>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      {tabs && <div>{tabs}</div>}
    </div>
  );
}
