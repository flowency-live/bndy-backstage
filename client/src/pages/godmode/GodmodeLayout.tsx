import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  MapPin,
  User,
  Music,
  Users,
  Sparkles,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/godmode', icon: LayoutDashboard, exact: true },
  { name: 'Venues', href: '/godmode/venues', icon: MapPin },
  { name: 'Enrichment Queue', href: '/godmode/venues/enrichment', icon: Sparkles, indent: true },
  { name: 'Artists', href: '/godmode/artists', icon: User },
  { name: 'Events', href: '/godmode/events', icon: Calendar },
  { name: 'Songs', href: '/godmode/songs', icon: Music },
  { name: 'Users', href: '/godmode/users', icon: Users },
];

interface GodmodeLayoutProps {
  children: React.ReactNode;
}

export default function GodmodeLayout({ children }: GodmodeLayoutProps) {
  const [location] = useLocation();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return location === href;
    }
    return location.startsWith(href);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold">Godmode Admin</h1>
            <p className="text-sm text-muted-foreground mt-1">Platform management</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, item.exact);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    item.indent && 'ml-6',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t text-xs text-muted-foreground">
            <div>BNDY Platform Admin</div>
            <div className="mt-1">Version 2.0</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 max-w-7xl">
          {children}
        </div>
      </div>
    </div>
  );
}
