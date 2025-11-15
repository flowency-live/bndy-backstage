/**
 * BNDY Backstage Design System Tokens
 *
 * Centralized design constants for consistent UI across the application.
 * Use these tokens instead of arbitrary Tailwind classes.
 *
 * @see /DESIGN_SYSTEM.md for usage guidelines
 */

/**
 * Spacing Scale
 * Based on 4px increments for consistent spacing throughout the app
 */
export const SPACING = {
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
} as const;

/**
 * Typography Scale
 * Responsive text sizes with mobile-first approach
 */
export const TYPOGRAPHY = {
  display: 'text-3xl sm:text-4xl font-bold',           // Page titles (rarely used)
  h1: 'text-2xl sm:text-3xl font-bold',                // Main section titles
  h2: 'text-xl sm:text-2xl font-semibold',             // Subsection titles
  h3: 'text-lg sm:text-xl font-semibold',              // Card titles, smaller headers
  body: 'text-sm sm:text-base',                        // Standard body text
  small: 'text-xs sm:text-sm',                         // Metadata, captions
  tiny: 'text-xs',                                     // Very small text (badges, etc)
} as const;

/**
 * Component Size Standards
 * Standardized sizes for buttons, avatars, icons
 */
export const COMPONENT_SIZES = {
  button: {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 text-base',
    lg: 'h-12 px-6 text-base',
    touch: 'min-h-14 px-4 text-base',   // Mobile touch targets (56px minimum)
  },
  avatar: {
    xs: 'w-6 h-6',      // 24px
    sm: 'w-8 h-8',      // 32px
    md: 'w-12 h-12',    // 48px
    lg: 'w-16 h-16',    // 64px
    xl: 'w-20 h-20',    // 80px
  },
  icon: {
    sm: 'w-8 h-8',      // 32px
    md: 'w-10 h-10',    // 40px
    lg: 'w-12 h-12',    // 48px
  },
} as const;

/**
 * Container Max-Width Standards
 * Mobile-first: edge-to-edge on mobile, constrained on desktop
 */
export const CONTAINERS = {
  narrow: 'max-w-2xl',    // 672px - Modals, centered forms
  default: 'max-w-4xl',   // 896px - Most content pages
  wide: 'max-w-6xl',      // 1152px - Special cases only (requires justification)
  full: 'max-w-full',     // Full width (rare)
} as const;

/**
 * Border Width Standards
 */
export const BORDERS = {
  default: 'border',      // 1px - Standard borders
  thick: 'border-2',      // 2px - Emphasis, selected states
  accent: 'border-l-4',   // 4px - Left accent border (gig cards, etc)
} as const;

/**
 * Shadow Levels
 * Use sparingly for depth hierarchy
 */
export const SHADOWS = {
  sm: 'shadow-sm',        // Subtle elevation
  md: 'shadow-md',        // Standard card elevation
  lg: 'shadow-lg',        // Modal elevation
  xl: 'shadow-xl',        // Maximum elevation
} as const;

/**
 * Standard Padding Patterns
 * Common padding combinations for different contexts
 */
export const PADDING = {
  card: {
    compact: 'p-4',       // 16px - List items, compact cards
    standard: 'p-6',      // 24px - Standard cards, modal content
    large: 'p-12',        // 48px - Empty states, special cards
  },
  page: {
    mobile: 'px-4 py-6',
    responsive: 'px-4 sm:px-6 lg:px-8 pt-6 pb-8',
  },
  modal: {
    header: 'px-6 py-4',
    content: 'p-6',
    footer: 'px-6 py-4',
  },
} as const;

/**
 * Gap/Spacing Patterns
 * Standard gaps for flex and grid layouts
 */
export const GAPS = {
  tight: 'gap-2',         // 8px
  normal: 'gap-3',        // 12px
  relaxed: 'gap-4',       // 16px
  loose: 'gap-6',         // 24px
} as const;

/**
 * Vertical Spacing (space-y)
 */
export const VERTICAL_SPACING = {
  tight: 'space-y-2',     // 8px - Compact lists
  normal: 'space-y-4',    // 16px - Form fields
  relaxed: 'space-y-6',   // 24px - Sections
  loose: 'space-y-8',     // 32px - Major sections
} as const;

/**
 * Animation Durations
 * Consistent timing for transitions
 */
export const DURATIONS = {
  fast: 'duration-150',
  normal: 'duration-300',
  slow: 'duration-500',
} as const;

/**
 * Z-Index Layers
 * Consistent stacking order
 */
export const Z_INDEX = {
  base: 'z-0',
  dropdown: 'z-10',
  sticky: 'z-20',
  fixed: 'z-30',
  overlay: 'z-40',
  modal: 'z-50',
  toast: 'z-60',
} as const;
