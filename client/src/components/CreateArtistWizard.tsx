import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft, ArrowRight, Globe } from "lucide-react";
import ImageUpload from "@/components/ui/image-upload";
import { fetchFacebookProfilePicture } from "@/lib/utils/facebook-utils";
import { FaFacebook, FaInstagram, FaYoutube, FaSpotify, FaXTwitter } from "react-icons/fa6";

// Hardcoded artist types for initial implementation
// Will be fetched from backend configuration later
const ARTIST_TYPES = [
  { value: 'band', label: 'Band', enabled: true },
  { value: 'duo', label: 'Duo', enabled: true },
  { value: 'group', label: 'Group', enabled: true },
  { value: 'solo', label: 'Solo Act', enabled: true },
  { value: 'dj', label: 'DJ', enabled: false }, // Disabled initially
] as const;

// Hardcoded genres for initial implementation
// Will be fetched from backend configuration later
const GENRES = [
  'Rock', 'Pop', 'Jazz', 'Blues', 'Country', 'Folk', 'Metal',
  'Punk', 'Indie', 'Alternative', 'Electronic', 'Dance', 'Hip Hop',
  'R&B', 'Soul', 'Funk', 'Reggae', 'Latin', 'Classical', 'Other'
];

type ArtistType = typeof ARTIST_TYPES[number]['value'];

interface WizardData {
  artistType: ArtistType | null;
  name: string;
  location: string;
  description: string;
  genres: string[];
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  spotifyUrl: string;
  twitterUrl: string;
  websiteUrl: string;
  profileImageUrl: string;
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

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [wizardData, setWizardData] = useState<WizardData>({
    artistType: null,
    name: "",
    location: "",
    description: "",
    genres: [],
    facebookUrl: "",
    instagramUrl: "",
    youtubeUrl: "",
    spotifyUrl: "",
    twitterUrl: "",
    websiteUrl: "",
    profileImageUrl: "",
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
          bio: data.description || null,
          genres: data.genres,
          artistType: data.artistType,
          facebookUrl: data.facebookUrl || null,
          instagramUrl: data.instagramUrl || null,
          websiteUrl: data.websiteUrl || null,
          socialMediaUrls: [
            ...(data.youtubeUrl ? [{ type: 'youtube', url: data.youtubeUrl }] : []),
            ...(data.spotifyUrl ? [{ type: 'spotify', url: data.spotifyUrl }] : []),
            ...(data.twitterUrl ? [{ type: 'twitter', url: data.twitterUrl }] : []),
          ],
          profileImageUrl: data.profileImageUrl || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create artist");
      }

      return await response.json();
    },
    onSuccess: (response) => {
      console.log('🎨 Artist created successfully:', response);

      // Set artist as active context
      const artistId = response.artist.id;
      console.log('🎯 Setting artist context:', artistId);
      localStorage.setItem('bndy-selected-artist-id', artistId);

      toast({
        title: "Artist created!",
        description: `${wizardData.name} has been created successfully.`,
      });

      // Invalidate queries and reload page to activate artist context
      queryClient.invalidateQueries({ queryKey: ["api-memberships-me"] });
      queryClient.invalidateQueries({ queryKey: ["users-profile"] });

      console.log('🔄 Reloading page to activate artist context...');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create artist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Auto-progress on type selection
  const handleTypeSelect = (type: ArtistType) => {
    setWizardData(prev => ({ ...prev, artistType: type }));
    // Auto-advance to next step
    setTimeout(() => setCurrentStep(2), 300);
  };

  // Toggle genre selection
  const toggleGenre = (genre: string) => {
    setWizardData(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }));
  };

  // Auto-fetch Facebook profile picture when URL is entered
  useEffect(() => {
    const fetchFBPicture = async () => {
      if (wizardData.facebookUrl && !wizardData.profileImageUrl) {
        const picUrl = await fetchFacebookProfilePicture(wizardData.facebookUrl);
        if (picUrl) {
          setWizardData(prev => ({ ...prev, profileImageUrl: picUrl }));
          toast({
            title: "Profile picture found!",
            description: "We've automatically set your artist avatar from Facebook.",
          });
        }
      }
    };

    const timeoutId = setTimeout(fetchFBPicture, 1000); // Debounce 1 second
    return () => clearTimeout(timeoutId);
  }, [wizardData.facebookUrl]);

  // Navigation helpers
  const canGoNext = () => {
    if (currentStep === 2) return wizardData.name.trim(); // Allow even if duplicate
    if (currentStep === 3) return true; // Description and location optional
    if (currentStep === 4) return true; // Genres optional
    if (currentStep === 5) return true; // All social media fields optional
    return false;
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep((currentStep + 1) as 1 | 2 | 3 | 4 | 5);
    } else {
      // Final step - submit
      createArtistMutation.mutate(wizardData);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as 1 | 2 | 3 | 4 | 5);
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
              {currentStep === 3 && "Tell us about your artist"}
              {currentStep === 4 && "Your Profile"}
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

          {/* Progress indicator - only show after step 1 */}
          {currentStep > 1 && (
            <div className="flex gap-2 mt-4">
              {[2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    step <= currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-6">
          {/* Step 1: Artist Type Selection - Auto-progresses */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <p className="text-muted-foreground">Select the type of artist profile you want to create:</p>

              <div className="space-y-2">
                {enabledTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => handleTypeSelect(type.value)}
                    className="w-full p-4 rounded-lg border-2 text-left transition-all border-border hover:border-primary/50 hover:bg-muted"
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

          {/* Step 3: Description & Location */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <p className="text-muted-foreground">Add details about your artist (will show on your public profile)</p>

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
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <textarea
                  value={wizardData.description}
                  onChange={(e) => setWizardData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Tell people about this artist..."
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-border rounded-lg focus:border-primary focus:outline-none transition-colors resize-none"
                  data-testid="input-description"
                />
                <p className="text-xs text-muted-foreground mt-1">This will appear on your public profile</p>
              </div>
            </div>
          )}

          {/* Step 4: Genres */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Genres (Optional)</label>
                <p className="text-xs text-muted-foreground mb-3">Select all that apply</p>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => toggleGenre(genre)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        wizardData.genres.includes(genre)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                      data-testid={`badge-genre-${genre.toLowerCase()}`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Social Media & Avatar */}
          {currentStep === 5 && (
            <div className="space-y-6">
              {/* Artist Avatar Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">Artist Avatar (Optional)</label>
                <ImageUpload
                  value={wizardData.profileImageUrl}
                  onChange={(url) => setWizardData(prev => ({ ...prev, profileImageUrl: url || "" }))}
                  size="lg"
                  placeholder="Upload artist image"
                />
                {wizardData.facebookUrl && !wizardData.profileImageUrl && (
                  <p className="text-xs text-amber-600 mt-2">
                    💡 We'll try to auto-fetch your profile picture from Facebook
                  </p>
                )}
              </div>

              {/* Social Media Links */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium">Social Media Links (Optional)</label>
                  <p className="text-xs text-muted-foreground">* You can add these later</p>
                </div>

                {/* Facebook */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#1877F2] flex items-center justify-center flex-shrink-0">
                    <FaFacebook className="w-6 h-6 text-white" />
                  </div>
                  <input
                    type="url"
                    value={wizardData.facebookUrl}
                    onChange={(e) => setWizardData(prev => ({ ...prev, facebookUrl: e.target.value }))}
                    placeholder="https://facebook.com/yourband"
                    className="flex-1 px-4 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none transition-colors"
                    data-testid="input-facebook"
                  />
                </div>

                {/* Instagram */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] flex items-center justify-center flex-shrink-0">
                    <FaInstagram className="w-6 h-6 text-white" />
                  </div>
                  <input
                    type="url"
                    value={wizardData.instagramUrl}
                    onChange={(e) => setWizardData(prev => ({ ...prev, instagramUrl: e.target.value }))}
                    placeholder="https://instagram.com/yourband"
                    className="flex-1 px-4 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none transition-colors"
                    data-testid="input-instagram"
                  />
                </div>

                {/* YouTube */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#FF0000] flex items-center justify-center flex-shrink-0">
                    <FaYoutube className="w-6 h-6 text-white" />
                  </div>
                  <input
                    type="url"
                    value={wizardData.youtubeUrl}
                    onChange={(e) => setWizardData(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                    placeholder="https://youtube.com/@yourband"
                    className="flex-1 px-4 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none transition-colors"
                    data-testid="input-youtube"
                  />
                </div>

                {/* Spotify */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#1DB954] flex items-center justify-center flex-shrink-0">
                    <FaSpotify className="w-6 h-6 text-white" />
                  </div>
                  <input
                    type="url"
                    value={wizardData.spotifyUrl}
                    onChange={(e) => setWizardData(prev => ({ ...prev, spotifyUrl: e.target.value }))}
                    placeholder="https://open.spotify.com/artist/..."
                    className="flex-1 px-4 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none transition-colors"
                    data-testid="input-spotify"
                  />
                </div>

                {/* X (Twitter) */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center flex-shrink-0">
                    <FaXTwitter className="w-5 h-5 text-white" />
                  </div>
                  <input
                    type="url"
                    value={wizardData.twitterUrl}
                    onChange={(e) => setWizardData(prev => ({ ...prev, twitterUrl: e.target.value }))}
                    placeholder="https://x.com/yourband"
                    className="flex-1 px-4 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none transition-colors"
                    data-testid="input-twitter"
                  />
                </div>

                {/* Website */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-600 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <input
                    type="url"
                    value={wizardData.websiteUrl}
                    onChange={(e) => setWizardData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                    placeholder="https://yourband.com"
                    className="flex-1 px-4 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none transition-colors"
                    data-testid="input-website"
                  />
                </div>
              </div>

              {/* Genres */}
              <div>
                <label className="block text-sm font-medium mb-2">Genres (Optional)</label>
                <p className="text-xs text-muted-foreground mb-3">Select all that apply</p>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => toggleGenre(genre)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        wizardData.genres.includes(genre)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                      data-testid={`badge-genre-${genre.toLowerCase()}`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons - Hidden on Step 1 (auto-progresses) */}
          {currentStep > 1 && (
            <div className="flex gap-3 mt-8">
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

              <Button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext() || createArtistMutation.isPending}
                className="flex-1"
                data-testid="button-wizard-next"
              >
                {createArtistMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : currentStep === 4 ? (
                  "Create Artist"
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
