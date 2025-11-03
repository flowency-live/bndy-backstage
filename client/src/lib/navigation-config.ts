import { Home, Calendar, Music, Settings, User, ListChecks } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavigationItem {
  icon: LucideIcon;
  label: string;
  href: string;
  color: string;
  description: string;
}

export const navigationItems: NavigationItem[] = [
  {
    icon: Home,
    label: "Dashboard",
    href: "/dashboard",
    color: "hsl(220, 13%, 51%)",
    description: "Overview & quick actions"
  },
  {
    icon: Calendar,
    label: "Calendar",
    href: "/calendar",
    color: "hsl(271, 91%, 65%)",
    description: "Schedule & events"
  },
  {
    icon: Music,
    label: "Playbook",
    href: "/songs",
    color: "hsl(45, 93%, 47%)",
    description: "Performance-ready songs & setlists"
  },
  {
    icon: ListChecks,
    label: "Pipeline",
    href: "/pipeline",
    color: "hsl(25, 95%, 53%)",
    description: "Suggest, vote & practice songs"
  },
  {
    icon: Settings,
    label: "Manage Artist",
    href: "/admin",
    color: "hsl(220, 13%, 51%)",
    description: "Artist management & settings"
  },
  {
    icon: User,
    label: "Profile",
    href: "/profile",
    color: "hsl(220, 13%, 51%)",
    description: "Personal settings"
  }
];