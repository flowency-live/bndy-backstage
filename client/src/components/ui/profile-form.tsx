/// <reference types="@types/google.maps" />
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader } from "@googlemaps/js-api-loader";
import { insertUserProfileSchema, updateUserProfileSchema, INSTRUMENT_OPTIONS, type InsertUserProfile, type UpdateUserProfile } from "@/types/api";
import { cn } from "@/lib/utils";
import { User, Camera, MapPin, Music } from "lucide-react";
import { useForceDarkMode } from "@/hooks/use-force-dark-mode";
import ImageUpload from "@/components/ui/image-upload";

interface ProfileFormProps {
  initialData?: Partial<UpdateUserProfile>;
  onSubmit: (data: InsertUserProfile | UpdateUserProfile) => Promise<void>;
  isLoading?: boolean;
  mode?: "create" | "edit";
  className?: string;
}

export default function ProfileForm({ 
  initialData, 
  onSubmit, 
  isLoading = false, 
  mode = "create",
  className 
}: ProfileFormProps) {
  // Force dark mode for consistency
  useForceDarkMode();
  
  const { toast } = useToast();
  const [placesLoaded, setPlacesLoaded] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialData?.avatarUrl || null);
  const hometownInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Use appropriate schema based on mode
  const schema = mode === "create" ? insertUserProfileSchema : updateUserProfileSchema;
  
  const form = useForm<InsertUserProfile | UpdateUserProfile>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: initialData?.firstName || "",
      lastName: initialData?.lastName || "",
      displayName: initialData?.displayName || "",
      hometown: initialData?.hometown || "",
      instrument: initialData?.instrument || undefined,
    },
  });

  // Initialize Google Places Autocomplete
  useEffect(() => {
    const initializePlaces = async () => {
      try {
        // Check if GOOGLE_MAPS_API_KEY is available
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          setPlacesError("Google Maps API key not configured");
          return;
        }

        const loader = new Loader({
          apiKey,
          version: "weekly",
          libraries: ["places"],
        });

        await loader.load();

        if (hometownInputRef.current) {
          const autocomplete = new google.maps.places.Autocomplete(
            hometownInputRef.current,
            {
              types: ["(cities)"],
              componentRestrictions: { country: "GB" }, // Restrict to UK
              fields: ["name", "formatted_address", "address_components"],
            }
          );

          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (place.name) {
              form.setValue("hometown", place.name);
            } else if (place.formatted_address) {
              form.setValue("hometown", place.formatted_address);
            }
          });

          autocompleteRef.current = autocomplete;
          setPlacesLoaded(true);
        }
      } catch (error) {
        console.error("Failed to load Google Places:", error);
        setPlacesError("Failed to load location services");
        // Continue without autocomplete - user can still type manually
      }
    };

    initializePlaces();

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [form]);

  const handleSubmit = async (data: InsertUserProfile | UpdateUserProfile) => {
    try {
      // Include avatar URL in the submission data
      const submitData = { ...data, avatarUrl };
      await onSubmit(submitData);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save profile",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={cn("w-full animate-fade-in", className)}>
      {/* Avatar Section - simplified, no headers */}
      <div className="flex justify-center mb-6">
        <ImageUpload
          value={avatarUrl || undefined}
          onChange={(value) => setAvatarUrl(value)}
          placeholder="Upload your profile picture"
          size="lg"
          data-testid="profile-avatar-upload"
        />
      </div>

      {/* Form Container */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Required Fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-400 font-medium text-sm">First Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="John"
                        data-testid="input-first-name"
                      />
                    </FormControl>
                    <FormMessage className="text-orange-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-400 font-medium text-sm">Last Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Smith"
                        data-testid="input-last-name"
                      />
                    </FormControl>
                    <FormMessage className="text-orange-400" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-400 font-medium text-sm">Display Name *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="How you'd like to be known"
                      data-testid="input-display-name"
                    />
                  </FormControl>
                  <FormMessage className="text-orange-400" />
                </FormItem>
              )}
            />
          </div>

          {/* Optional Fields - no header, just separator */}
          <div className="space-y-4">
            <div className="border-t border-slate-600 pt-4">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="hometown"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-400 font-medium text-sm flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-orange-400" />
                        Hometown
                        {placesLoaded && (
                          <span className="text-orange-400 text-xs font-normal">
                            (Start typing for suggestions)
                          </span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          ref={hometownInputRef}
                          placeholder="London, Manchester, Birmingham..."
                          data-testid="input-hometown"
                        />
                      </FormControl>
                      {placesError && (
                        <p className="text-orange-400 text-xs mt-1">
                          {placesError} - You can still type your hometown manually
                        </p>
                      )}
                      <FormMessage className="text-orange-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="instrument"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-400 font-medium text-sm flex items-center gap-2">
                        <Music className="w-4 h-4 text-orange-400" />
                        Primary Instrument
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger 
                            data-testid="select-instrument"
                          >
                            <SelectValue placeholder="Choose your main instrument" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INSTRUMENT_OPTIONS.map((instrument) => (
                            <SelectItem 
                              key={instrument} 
                              value={instrument} 
                              data-testid={`option-instrument-${instrument.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              {instrument}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-orange-400" />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium py-3 text-base transition-all duration-200 hover:shadow-lg border-0"
            disabled={isLoading}
            data-testid="button-save-profile"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {mode === "create" ? "Creating Profile..." : "Saving Changes..."}
              </div>
            ) : (
              mode === "create" ? "Complete Profile" : "Save Changes"
            )}
          </Button>

        </form>
      </Form>
    </div>
  );
}