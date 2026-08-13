import { Link, useLocation } from 'wouter';
import {
  Activity,
  Calendar,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MapPin,
  Music,
  Sparkles,
  TrendingUp,
  User,
  Users,
  ArrowLeft,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import PlatformAdminGate from '@/components/platform-admin-gate';
import { useOpenReviewCount } from './lib/queries';
import { useServerAuth } from '@/hooks/useServerAuth';

interface NavItem {
  name: string;
  href: string;
  icon: typeof Activity;
  exact?: boolean;
  /** Show the open review-item count badge on this entry. */
  reviewBadge?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// Two groups, ordered by what godmode is actually for: first triage what the
// automated pipeline produced, then curate the catalogue it wrote into.
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operate',
    items: [
      { name: 'Dashboard', href: '/godmode', icon: LayoutDashboard, exact: true },
      { name: 'Review Queue', href: '/godmode/sources/review', icon: ClipboardList, reviewBadge: true },
      { name: 'Sources', href: '/godmode/sources', icon: Activity, exact: true },
      { name: 'Agent Work', href: '/godmode/sources/activity', icon: TrendingUp },
      { name: 'Enrichment', href: '/godmode/enrichment', icon: Sparkles },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { name: 'Artists', href: '/godmode/artists', icon: User },
      { name: 'Venues', href: '/godmode/venues', icon: MapPin, exact: true },
      { name: 'Venue groups', href: '/godmode/venue-groups', icon: Building2 },
      { name: 'Events', href: '/godmode/events', icon: Calendar },
      { name: 'Songs', href: '/godmode/songs', icon: Music },
      { name: 'Users', href: '/godmode/users', icon: Users },
      { name: 'Curators', href: '/godmode/curators', icon: ShieldCheck },
    ],
  },
];

interface GodmodeLayoutProps {
  children: React.ReactNode;
}

function GodmodeNav() {
  const [location] = useLocation();
  const openReviews = useOpenReviewCount();

  const isActive = (item: NavItem) =>
    item.exact ? location === item.href : location.startsWith(item.href);

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {group.label}
          </div>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{item.name}</span>
                  {item.reviewBadge && openReviews !== undefined && openReviews > 0 && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none tabular-nums',
                        active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-orange-500 text-white',
                      )}
                    >
                      {openReviews > 99 ? '99+' : openReviews}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function GodmodeLayout({ children }: GodmodeLayoutProps) {
  const [, setLocation] = useLocation();
  const { signOut } = useServerAuth();

  const handleSignOut = async () => {
    localStorage.removeItem('bndy-selected-artist-id');
    localStorage.removeItem('bndy-selected-band-id');
    localStorage.removeItem('bndy-current-user');
    await signOut();
  };

  const handleBackToBackstage = () => {
    setLocation('/dashboard');
  };

  return (
    <PlatformAdminGate>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <div className="flex w-52 shrink-0 flex-col border-r bg-card">
          <div className="border-b px-4 py-4">
            <h1 className="text-lg font-bold leading-tight">Godmode</h1>
            <p className="text-xs text-muted-foreground">Platform admin</p>
          </div>
          <GodmodeNav />
          <div className="border-t px-3 py-3 space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToBackstage}
              className="w-full justify-start text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Backstage
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full justify-start text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
            <div className="px-2 text-[11px] text-muted-foreground">bndy platform · godmode v3</div>
          </div>
        </div>

        {/* Main content — full width; the tables want the room. */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5">{children}</div>
        </div>
      </div>
    </PlatformAdminGate>
  );
}
