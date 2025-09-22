import { Home, Calendar, Music, Settings, User } from "lucide-react";
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
    label: "Song Lists", 
    href: "/songs", 
    color: "hsl(45, 93%, 47%)",
    description: "Playbook, setlists & pipeline"
  },
  { 
    icon: Settings, 
    label: "Manage Band", 
    href: "/admin", 
    color: "hsl(220, 13%, 51%)",
    description: "Band management & settings"
  },
  { 
    icon: User, 
    label: "Profile", 
    href: "/profile", 
    color: "hsl(220, 13%, 51%)",
    description: "Personal settings"
  }
];