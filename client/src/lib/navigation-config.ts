import { Home, Calendar, Music, Settings, User, ListChecks, MapPin, Building2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavigationItem {
  icon: LucideIcon;
  label: string;
  href: string;
  color: string;
  description: string;
}

// Artist-focused navigation items
export const navigationItems: NavigationItem[] = [
  {
    icon: Home,
    label: "Dashboard",
    href: "/dashboard",
    color: "hsl(220, 13%, 51%)",
    description: ""
  },
  {
    icon: Calendar,
    label: "Calendar",
    href: "/calendar",
    color: "hsl(271, 91%, 65%)",
    description: ""
  },
  {
    icon: Music,
    label: "Playbook",
    href: "/songs",
    color: "hsl(45, 93%, 47%)",
    description: ""
  },
  {
    icon: ListChecks,
    label: "Song Pipeline",
    href: "/pipeline",
    color: "hsl(25, 95%, 53%)",
    description: ""
  },
  {
    icon: MapPin,
    label: "Venues",
    href: "/venues",
    color: "hsl(142, 76%, 36%)",
    description: ""
  },
  {
    icon: Settings,
    label: "Manage Artist",
    href: "/admin",
    color: "hsl(220, 13%, 51%)",
    description: ""
  },
  {
    icon: User,
    label: "My Profile",
    href: "/profile",
    color: "hsl(220, 13%, 51%)",
    description: ""
  }
];

// Builder-focused navigation items
export const builderNavigationItems: NavigationItem[] = [
  {
    icon: Building2,
    label: "Builder Dashboard",
    href: "/builder",
    color: "hsl(280, 85%, 55%)",
    description: "Manage your local music site"
  }
];

interface NavigationContext {
  hasBuilders: boolean;
  isBuilderContext: boolean;
}

/**
 * Returns navigation items appropriate for the user's context.
 * - If user has no builders: returns only artist navigation items
 * - If user has builders and is in artist context: returns artist items + builder link
 * - If user is in builder context: returns builder items
 */
export function getNavigationItems(context: NavigationContext): NavigationItem[] {
  const { hasBuilders, isBuilderContext } = context;

  if (!hasBuilders) {
    // User has no builders, show only artist navigation
    return [...navigationItems];
  }

  if (isBuilderContext) {
    // In builder context - show builder items first, then link back to artist dashboard
    return [...builderNavigationItems, ...navigationItems.filter(item => item.href === "/dashboard")];
  }

  // User has builders but is in artist context - show artist items with builder link
  const dashboardIndex = navigationItems.findIndex(item => item.href === "/dashboard");
  const result = [...navigationItems];

  // Insert builder item after dashboard
  result.splice(dashboardIndex + 1, 0, ...builderNavigationItems);

  return result;
}