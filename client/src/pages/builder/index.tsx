import { useLocation } from 'wouter';
import { useBuilder } from '@/lib/builder-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Globe, Palette, MapPin, Settings, Image, Calendar, MapPinned, ChevronRight } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  icon: React.ReactNode;
  href: string;
  children: React.ReactNode;
}

function DashboardCard({ title, icon, href, children }: DashboardCardProps) {
  const [, setLocation] = useLocation();

  return (
    <Card
      className="cursor-pointer hover:bg-muted/50 transition-colors group"
      onClick={() => setLocation(href)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex items-center gap-2">
          {icon}
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function BuilderDashboard() {
  const { currentBuilder, isLoading } = useBuilder();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!currentBuilder) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>No Builder Selected</CardTitle>
            <CardDescription>
              Select a builder from the persona selector to view its dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <div
          className="h-16 w-16 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: currentBuilder.theme.primaryColor }}
        >
          <Building2 className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{currentBuilder.name}</h1>
          <p className="text-muted-foreground">{currentBuilder.description}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="Subdomain"
          icon={<Globe className="h-4 w-4 text-muted-foreground" />}
          href="/builder/settings"
        >
          <div className="text-2xl font-bold">{currentBuilder.slug}.bndy.live</div>
          <p className="text-xs text-muted-foreground">
            Your white-label site URL
          </p>
        </DashboardCard>

        <DashboardCard
          title="Theme"
          icon={<Palette className="h-4 w-4 text-muted-foreground" />}
          href="/builder/theme"
        >
          <div className="flex gap-2">
            <div
              className="h-8 w-8 rounded-full border"
              style={{ backgroundColor: currentBuilder.theme.primaryColor }}
              title="Primary"
            />
            <div
              className="h-8 w-8 rounded-full border"
              style={{ backgroundColor: currentBuilder.theme.secondaryColor }}
              title="Secondary"
            />
            <div
              className="h-8 w-8 rounded-full border"
              style={{ backgroundColor: currentBuilder.theme.backgroundColor }}
              title="Background"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {currentBuilder.theme.defaultMode} mode
          </p>
        </DashboardCard>

        <DashboardCard
          title="Venue Coverage"
          icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
          href="/builder/venue-coverage"
        >
          <div className="text-2xl font-bold">
            {currentBuilder.coverage.postcode}
          </div>
          <p className="text-xs text-muted-foreground">
            {currentBuilder.coverage.radius} mile radius
          </p>
        </DashboardCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DashboardCard
          title="Branding"
          icon={<Image className="h-4 w-4 text-muted-foreground" />}
          href="/builder/branding"
        >
          {currentBuilder.branding?.logoUrl ? (
            <img
              src={currentBuilder.branding.logoUrl}
              alt={`${currentBuilder.name} logo`}
              className="h-12 object-contain"
            />
          ) : currentBuilder.branding?.tagline ? (
            <p className="text-muted-foreground">{currentBuilder.branding.tagline}</p>
          ) : (
            <p className="text-muted-foreground text-sm">No branding configured</p>
          )}
        </DashboardCard>

        <DashboardCard
          title="Settings"
          icon={<Settings className="h-4 w-4 text-muted-foreground" />}
          href="/builder/settings"
        >
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              currentBuilder.status === 'published'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : currentBuilder.status === 'draft'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}
          >
            {currentBuilder.status}
          </span>
          <p className="text-xs text-muted-foreground mt-2">
            Click to edit name, description, and status
          </p>
        </DashboardCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DashboardCard
          title="Venue Management"
          icon={<MapPinned className="h-4 w-4 text-muted-foreground" />}
          href="/builder/venue-management"
        >
          <p className="text-muted-foreground text-sm">
            Manage venue relationships, fees, and contacts
          </p>
        </DashboardCard>

        <DashboardCard
          title="Events"
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
          href="/builder/events"
        >
          <p className="text-muted-foreground text-sm">
            View and manage events in your coverage area
          </p>
        </DashboardCard>
      </div>
    </div>
  );
}
