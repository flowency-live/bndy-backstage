import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: ReactNode;
  variant?: 'default' | 'wide' | 'narrow' | 'full';
  className?: string;
}

/**
 * PageContainer - Standardized page wrapper component
 *
 * Provides consistent layout and spacing across all pages.
 *
 * @param variant - Container width variant:
 *   - 'default' (max-w-4xl): Most content pages
 *   - 'narrow' (max-w-2xl): Forms, modals
 *   - 'wide' (max-w-6xl): Special cases only
 *   - 'full' (max-w-full): Full width (rare)
 *
 * @example
 * ```tsx
 * <PageContainer variant="default">
 *   <PageHeader title="Gigs" />
 *   {/* Page content *\/}
 * </PageContainer>
 * ```
 */
export function PageContainer({
  children,
  variant = 'default',
  className
}: PageContainerProps) {
  const widthClasses = {
    default: 'max-w-4xl',
    wide: 'max-w-6xl',
    narrow: 'max-w-2xl',
    full: 'max-w-full'
  };

  return (
    <div className="min-h-screen bg-gradient-subtle animate-fade-in-up">
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        <div className={cn(widthClasses[variant], 'mx-auto', className)}>
          {children}
        </div>
      </div>
    </div>
  );
}
