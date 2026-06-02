import { useState, useEffect } from 'react';
import { useBuilder } from '@/lib/builder-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Save, Palette } from 'lucide-react';

const API_BASE_URL = 'https://api.bndy.co.uk';

// Preset themes
const PRESETS = [
  {
    name: 'Midnight',
    theme: {
      primaryColor: '#6366f1',
      secondaryColor: '#a855f7',
      backgroundColor: '#1a1a2e',
      foregroundColor: '#e5e5e5',
      defaultMode: 'dark' as const,
    },
  },
  {
    name: 'Ocean',
    theme: {
      primaryColor: '#0ea5e9',
      secondaryColor: '#06b6d4',
      backgroundColor: '#0c4a6e',
      foregroundColor: '#f0f9ff',
      defaultMode: 'dark' as const,
    },
  },
  {
    name: 'Forest',
    theme: {
      primaryColor: '#22c55e',
      secondaryColor: '#84cc16',
      backgroundColor: '#14532d',
      foregroundColor: '#f0fdf4',
      defaultMode: 'dark' as const,
    },
  },
  {
    name: 'Sunset',
    theme: {
      primaryColor: '#f97316',
      secondaryColor: '#eab308',
      backgroundColor: '#fff7ed',
      foregroundColor: '#1c1917',
      defaultMode: 'light' as const,
    },
  },
];

export default function BuilderTheme() {
  const { currentBuilder, isLoading, refresh } = useBuilder();
  const { toast } = useToast();

  const [primaryColor, setPrimaryColor] = useState('#ff00ff');
  const [secondaryColor, setSecondaryColor] = useState('#00ffff');
  const [backgroundColor, setBackgroundColor] = useState('#0a0a0a');
  const [foregroundColor, setForegroundColor] = useState('#ffffff');
  const [defaultMode, setDefaultMode] = useState<'light' | 'dark'>('dark');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync form with current builder
  useEffect(() => {
    if (currentBuilder) {
      setPrimaryColor(currentBuilder.theme.primaryColor);
      setSecondaryColor(currentBuilder.theme.secondaryColor);
      setBackgroundColor(currentBuilder.theme.backgroundColor);
      setForegroundColor(currentBuilder.theme.foregroundColor);
      setDefaultMode(currentBuilder.theme.defaultMode);
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
              Select a builder from the persona selector to edit theme.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isValidHexColor = (color: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!primaryColor) {
      newErrors.primaryColor = 'Primary color is required';
    } else if (!isValidHexColor(primaryColor)) {
      newErrors.primaryColor = 'Invalid color format (use #RRGGBB)';
    }

    if (!secondaryColor) {
      newErrors.secondaryColor = 'Secondary color is required';
    } else if (!isValidHexColor(secondaryColor)) {
      newErrors.secondaryColor = 'Invalid color format (use #RRGGBB)';
    }

    if (!backgroundColor) {
      newErrors.backgroundColor = 'Background color is required';
    } else if (!isValidHexColor(backgroundColor)) {
      newErrors.backgroundColor = 'Invalid color format (use #RRGGBB)';
    }

    if (!foregroundColor) {
      newErrors.foregroundColor = 'Foreground color is required';
    } else if (!isValidHexColor(foregroundColor)) {
      newErrors.foregroundColor = 'Invalid color format (use #RRGGBB)';
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
          theme: {
            primaryColor,
            secondaryColor,
            backgroundColor,
            foregroundColor,
            defaultMode,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update theme');
      }

      toast({
        title: 'Theme saved',
        description: 'Your theme settings have been updated.',
      });

      // Refresh the builder context to get updated data
      await refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save theme',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setPrimaryColor(preset.theme.primaryColor);
    setSecondaryColor(preset.theme.secondaryColor);
    setBackgroundColor(preset.theme.backgroundColor);
    setForegroundColor(preset.theme.foregroundColor);
    setDefaultMode(preset.theme.defaultMode);
    setErrors({});
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Theme</h1>
        <p className="text-muted-foreground">
          Customize the colors and appearance of your site.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form Section */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Colors</CardTitle>
                <CardDescription>
                  Set your brand colors for your site.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColorText">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColorPicker"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                      aria-label="Primary color picker"
                    />
                    <Input
                      id="primaryColorText"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#ff00ff"
                      className="flex-1"
                      aria-invalid={!!errors.primaryColor}
                    />
                  </div>
                  {errors.primaryColor && (
                    <p className="text-sm text-destructive">{errors.primaryColor}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondaryColorText">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColorPicker"
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                      aria-label="Secondary color picker"
                    />
                    <Input
                      id="secondaryColorText"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      placeholder="#00ffff"
                      className="flex-1"
                      aria-invalid={!!errors.secondaryColor}
                    />
                  </div>
                  {errors.secondaryColor && (
                    <p className="text-sm text-destructive">{errors.secondaryColor}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backgroundColorText">Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="backgroundColorPicker"
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                      aria-label="Background color picker"
                    />
                    <Input
                      id="backgroundColorText"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      placeholder="#0a0a0a"
                      className="flex-1"
                      aria-invalid={!!errors.backgroundColor}
                    />
                  </div>
                  {errors.backgroundColor && (
                    <p className="text-sm text-destructive">{errors.backgroundColor}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="foregroundColorText">Foreground Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="foregroundColorPicker"
                      type="color"
                      value={foregroundColor}
                      onChange={(e) => setForegroundColor(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                      aria-label="Foreground color picker"
                    />
                    <Input
                      id="foregroundColorText"
                      value={foregroundColor}
                      onChange={(e) => setForegroundColor(e.target.value)}
                      placeholder="#ffffff"
                      className="flex-1"
                      aria-invalid={!!errors.foregroundColor}
                    />
                  </div>
                  {errors.foregroundColor && (
                    <p className="text-sm text-destructive">{errors.foregroundColor}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultMode">Default Mode</Label>
                  <Select
                    value={defaultMode}
                    onValueChange={(value: 'light' | 'dark') => setDefaultMode(value)}
                  >
                    <SelectTrigger id="defaultMode" aria-label="Default Mode">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Preset Themes</CardTitle>
                <CardDescription>
                  Start with a preset and customize from there.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {PRESETS.map((preset) => (
                    <Button
                      key={preset.name}
                      type="button"
                      variant="outline"
                      className="h-auto py-3 flex flex-col gap-2"
                      onClick={() => applyPreset(preset)}
                    >
                      <div className="flex gap-1">
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: preset.theme.primaryColor }}
                        />
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: preset.theme.secondaryColor }}
                        />
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: preset.theme.backgroundColor }}
                        />
                      </div>
                      <span className="text-sm">{preset.name}</span>
                    </Button>
                  ))}
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

        {/* Preview Section */}
        <div className="lg:sticky lg:top-6 self-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Live Preview
              </CardTitle>
              <CardDescription>
                See how your theme will look.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                data-testid="theme-preview"
                className="rounded-lg p-6 min-h-[300px]"
                style={{
                  backgroundColor,
                  color: foregroundColor,
                }}
              >
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold" style={{ color: foregroundColor }}>
                    {currentBuilder.name}
                  </h2>
                  <p className="text-sm opacity-80">
                    {currentBuilder.branding.tagline || 'Your local music scene'}
                  </p>

                  <div className="flex gap-2 pt-4">
                    <button
                      data-testid="preview-primary-button"
                      className="px-4 py-2 rounded-md font-medium text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Primary Button
                    </button>
                    <button
                      data-testid="preview-secondary-button"
                      className="px-4 py-2 rounded-md font-medium text-white"
                      style={{ backgroundColor: secondaryColor }}
                    >
                      Secondary
                    </button>
                  </div>

                  <div
                    className="mt-4 p-4 rounded border"
                    style={{
                      borderColor: primaryColor,
                      backgroundColor: `${primaryColor}10`,
                    }}
                  >
                    <h3 className="font-semibold" style={{ color: primaryColor }}>
                      Sample Card
                    </h3>
                    <p className="text-sm mt-1" style={{ color: foregroundColor }}>
                      This is how cards and highlighted content will appear.
                    </p>
                  </div>

                  <div className="mt-4 text-xs opacity-60">
                    Mode: {defaultMode === 'dark' ? 'Dark' : 'Light'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
