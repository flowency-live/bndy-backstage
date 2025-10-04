import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft, ArrowRight } from "lucide-react";

// Hardcoded artist types for initial implementation
// Will be fetched from backend configuration later
const ARTIST_TYPES = [
  { value: 'band', label: 'Band', enabled: true },
  { value: 'duo', label: 'Duo', enabled: true },
  { value: 'group', label: 'Group', enabled: true },
  { value: 'solo', label: 'Solo Act', enabled: true },
  { value: 'dj', label: 'DJ', enabled: false }, // Disabled initially
] as const;

type ArtistType = typeof ARTIST_TYPES[number]['value'];

interface WizardData {
  artistType: ArtistType | null;
  name: string;
  location: string;
  displayName: string;
  icon: string;
  color: string;
}

interface ExistingArtist {
  id: string;
  name: string;
  location: string | null;
}

interface CreateArtistWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateArtistWizard({ onClose, onSuccess }: CreateArtistWizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [wizardData, setWizardData] = useState<WizardData>({
    artistType: null,
    name: "",
    location: "",
    displayName: "",
    icon: "fa-music",
    color: "#708090",
  });

  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const [existingArtists, setExistingArtists] = useState<ExistingArtist[]>([]);
  const [checkingName, setCheckingName] = useState(false);

  // Get enabled artist types
  const enabledTypes = ARTIST_TYPES.filter(t => t.enabled);

  // Get context-aware labels
  const getTypeLabel = (type: ArtistType | null): string => {
    if (!type) return "Artist";
    const typeConfig = ARTIST_TYPES.find(t => t.value === type);
    return typeConfig?.label || "Artist";
  };

  // Check name uniqueness
  const checkNameAvailability = async (name: string) => {
    if (!name.trim()) {
      setNameAvailable(null);
      setExistingArtists([]);
      return;
    }

    setCheckingName(true);

    try {
      const response = await fetch(`/api/artists/check-name?name=${encodeURIComponent(name)}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to check name availability');
      }

      const data = await response.json();
      setNameAvailable(data.available);
      setExistingArtists(data.matches || []);
    } catch (error) {
      console.error('Error checking name:', error);
      setNameAvailable(null);
      setExistingArtists([]);
      toast({
        title: "Error",
        description: "Could not check name availability. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCheckingName(false);
    }
  };

  // Handle name change with debouncing
  const handleNameChange = (name: string) => {
    setWizardData(prev => ({ ...prev, name }));
    setNameAvailable(null);

    // Debounced check
    const timeoutId = setTimeout(() => {
      checkNameAvailability(name);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  // Create artist mutation
  const createArtistMutation = useMutation({
    mutationFn: async (data: WizardData) => {
      const response = await fetch("/api/artists", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          location: data.location || null,
          artistType: data.artistType,
          memberDisplayName: data.displayName || null,
          memberIcon: data.icon,
          memberColor: data.color,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create artist");
      }

      return await response.json();
    },
    onSuccess: ({ artist }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      localStorage.setItem('bndy-selected-context-id', artist.id);

      toast({
        title: "Artist created!",
        description: `${wizardData.name} has been created successfully.`,
      });

      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create artist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Navigation helpers
  const canGoNext = () => {
    if (currentStep === 1) return wizardData.artistType !== null;
    if (currentStep === 2) return wizardData.name.trim(); // Allow even if duplicate
    if (currentStep === 3) return wizardData.displayName.trim();
    return false;
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((currentStep + 1) as 1 | 2 | 3);
    } else {
      // Final step - submit
      createArtistMutation.mutate(wizardData);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as 1 | 2 | 3);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-serif">
              {currentStep === 1 && "Create new..."}
              {currentStep === 2 && `What's the ${getTypeLabel(wizardData.artistType)} name?`}
              {currentStep === 3 && "Your Profile"}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-full"
              data-testid="button-close-wizard"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress indicator */}
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  step <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Step 1: Artist Type Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <p className="text-muted-foreground">Select the type of artist profile you want to create:</p>

              <div className="space-y-2">
                {enabledTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setWizardData(prev => ({ ...prev, artistType: type.value }))}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      wizardData.artistType === type.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-muted'
                    }`}
                    data-testid={`button-type-${type.value}`}
                  >
                    <div className="font-semibold text-lg">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Name Input */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  value={wizardData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={`Enter ${getTypeLabel(wizardData.artistType).toLowerCase()} name`}
                  className="w-full px-4 py-3 text-lg border-2 border-border rounded-lg focus:border-primary focus:outline-none transition-colors"
                  autoFocus
                  data-testid="input-artist-name"
                />

                {checkingName && (
                  <p className="text-sm text-muted-foreground mt-2">Checking availability...</p>
                )}

                {!checkingName && nameAvailable === false && existingArtists.length > 0 && (
                  <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg" data-testid="warning-name-exists">
                    <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-2">
                      ⚠️ {existingArtists.length} artist{existingArtists.length > 1 ? 's' : ''} with this name already exist{existingArtists.length === 1 ? 's' : ''}:
                    </p>
                    <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1 ml-4">
                      {existingArtists.map((artist) => (
                        <li key={artist.id}>
                          {artist.name} {artist.location ? `(${artist.location})` : '(no location)'}
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mt-2">
                      If this is a different artist, add a location on the next step to differentiate.
                    </p>
                  </div>
                )}

                {!checkingName && nameAvailable === true && wizardData.name.trim() && (
                  <p className="text-sm text-green-600 mt-2" data-testid="success-name-available">
                    ✓ Name is available
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Member Profile + Location */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <p className="text-muted-foreground">Complete your artist profile</p>

              {/* Show reminder if duplicates exist */}
              {existingArtists.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    💡 Add a location to differentiate from existing artists named "{wizardData.name}"
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Location {existingArtists.length > 0 && <span className="text-amber-600">(Recommended)</span>}
                </label>
                <input
                  type="text"
                  value={wizardData.location}
                  onChange={(e) => setWizardData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Stoke-on-Trent, Manchester, London"
                  className="w-full px-4 py-3 border-2 border-border rounded-lg focus:border-primary focus:outline-none transition-colors"
                  autoFocus={existingArtists.length > 0}
                  data-testid="input-location"
                />
                <p className="text-xs text-muted-foreground mt-1">City or region where this artist is based</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Display Name *</label>
                <input
                  type="text"
                  value={wizardData.displayName}
                  onChange={(e) => setWizardData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Your name in this artist"
                  className="w-full px-4 py-3 border-2 border-border rounded-lg focus:border-primary focus:outline-none transition-colors"
                  autoFocus={existingArtists.length === 0}
                  data-testid="input-display-name"
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-8">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="flex-1"
                data-testid="button-wizard-back"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}

            <Button
              type="button"
              onClick={handleNext}
              disabled={!canGoNext() || createArtistMutation.isPending}
              className={`flex-1 ${currentStep === 1 ? 'w-full' : ''}`}
              data-testid="button-wizard-next"
            >
              {createArtistMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : currentStep === 3 ? (
                "Create Artist"
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
