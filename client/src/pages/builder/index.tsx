import { useBuilder } from '@/lib/builder-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Globe, Palette, MapPin } from 'lucide-react';

export default function BuilderDashboard() {
  const { currentBuilder, isLoading } = useBuilder();

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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subdomain</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentBuilder.slug}.bndy.live</div>
            <p className="text-xs text-muted-foreground">
              Your white-label site URL
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Theme</CardTitle>
            <Palette className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coverage</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentBuilder.coverage.postcode}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentBuilder.coverage.radius} mile radius
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>Your builder's branding configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentBuilder.branding.logoUrl && (
            <div>
              <p className="text-sm font-medium mb-2">Logo</p>
              <img
                src={currentBuilder.branding.logoUrl}
                alt={`${currentBuilder.name} logo`}
                className="h-16 object-contain"
              />
            </div>
          )}
          {currentBuilder.branding.tagline && (
            <div>
              <p className="text-sm font-medium mb-1">Tagline</p>
              <p className="text-muted-foreground">{currentBuilder.branding.tagline}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
