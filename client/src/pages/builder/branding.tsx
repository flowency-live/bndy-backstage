import { useState, useEffect } from 'react';
import { useBuilder } from '@/lib/builder-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, ImageIcon } from 'lucide-react';

const API_BASE_URL = 'https://api.bndy.co.uk';

export default function BuilderBranding() {
  const { currentBuilder, isLoading, refresh } = useBuilder();
  const { toast } = useToast();

  const [logoUrl, setLogoUrl] = useState('');
  const [tagline, setTagline] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ logoUrl?: string }>({});

  // Sync form with current builder
  useEffect(() => {
    if (currentBuilder) {
      setLogoUrl(currentBuilder.branding.logoUrl || '');
      setTagline(currentBuilder.branding.tagline || '');
    }
  }, [currentBuilder]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
              Select a builder from the persona selector to edit branding.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isValidUrl = (url: string): boolean => {
    if (!url) return true; // Empty is OK
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validate = (): boolean => {
    const newErrors: { logoUrl?: string } = {};

    if (logoUrl && !isValidUrl(logoUrl)) {
      newErrors.logoUrl = 'Invalid URL format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/builders/${currentBuilder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          branding: {
            logoUrl: logoUrl.trim() || undefined,
            tagline: tagline.trim() || undefined,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update branding');
      }

      toast({
        title: 'Branding saved',
        description: 'Your branding settings have been updated.',
      });

      // Refresh the builder context to get updated data
      await refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save branding',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Branding</h1>
        <p className="text-muted-foreground">
          Customize your site's logo and tagline.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
            <CardDescription>
              Add a logo to display on your site.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-6">
              <div className="flex-1 space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  aria-invalid={!!errors.logoUrl}
                />
                {errors.logoUrl && (
                  <p className="text-sm text-destructive">{errors.logoUrl}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Enter a URL to an image file (PNG, JPG, SVG recommended).
                </p>
              </div>
              <div className="w-32 h-32 border rounded-lg flex items-center justify-center bg-muted">
                {logoUrl && isValidUrl(logoUrl) ? (
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                    <span className="text-xs">No logo set</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Tagline</CardTitle>
            <CardDescription>
              A short phrase that describes your site.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Your local music scene"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                This will appear below your logo on your site.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
