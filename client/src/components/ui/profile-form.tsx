/// <reference types="@types/google.maps" />
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader } from "@googlemaps/js-api-loader";
import { insertUserProfileSchema, updateUserProfileSchema, INSTRUMENT_OPTIONS, type InsertUserProfile, type UpdateUserProfile } from "@shared/schema";
import { cn } from "@/lib/utils";

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
  const { toast } = useToast();
  const [placesLoaded, setPlacesLoaded] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
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
      await onSubmit(data);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save profile",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-brand-neutral-light flex items-center justify-center border-4 border-white shadow-lg">
                <i className="fas fa-user text-white text-2xl"></i>
              </div>
              {/* Placeholder for future avatar upload */}
              <button
                type="button"
                className="absolute bottom-0 right-0 w-8 h-8 bg-brand-accent rounded-full flex items-center justify-center text-white shadow-lg hover:bg-brand-accent-light transition-colors"
                data-testid="button-avatar-upload"
                onClick={() => {
                  toast({
                    title: "Coming Soon",
                    description: "Avatar upload will be available soon!",
                  });
                }}
              >
                <i className="fas fa-camera text-xs"></i>
              </button>
            </div>
            {mode === "create" && (
              <div className="text-center">
                <h2 className="text-xl font-serif text-brand-primary">Complete Your Profile</h2>
                <p className="text-brand-neutral text-sm">Help your bandmates get to know you</p>
              </div>
            )}
          </div>

          {/* Required Fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-brand-primary font-medium">First Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="John"
                        className="bg-white border-brand-neutral-light focus:border-brand-primary"
                        data-testid="input-first-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-brand-primary font-medium">Last Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Smith"
                        className="bg-white border-brand-neutral-light focus:border-brand-primary"
                        data-testid="input-last-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-brand-primary font-medium">Display Name *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="How you'd like to be known"
                      className="bg-white border-brand-neutral-light focus:border-brand-primary"
                      data-testid="input-display-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Optional Fields */}
          <div className="space-y-4">
            <div className="border-t border-brand-neutral-light pt-4">
              <h3 className="text-lg font-serif text-brand-primary mb-3">Optional Information</h3>
              
              <FormField
                control={form.control}
                name="hometown"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-brand-primary font-medium">
                      Hometown
                      {placesLoaded && <span className="text-brand-secondary text-xs ml-2">(Start typing for suggestions)</span>}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        ref={hometownInputRef}
                        placeholder="London, Manchester, Birmingham..."
                        className="bg-white border-brand-neutral-light focus:border-brand-primary"
                        data-testid="input-hometown"
                      />
                    </FormControl>
                    {placesError && (
                      <p className="text-brand-unavailable text-xs mt-1">
                        {placesError} - You can still type your hometown manually
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instrument"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-brand-primary font-medium">Primary Instrument</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger 
                          className="bg-white border-brand-neutral-light focus:border-brand-primary"
                          data-testid="select-instrument"
                        >
                          <SelectValue placeholder="Choose your main instrument" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INSTRUMENT_OPTIONS.map((instrument) => (
                          <SelectItem key={instrument} value={instrument} data-testid={`option-instrument-${instrument.toLowerCase().replace(/\s+/g, '-')}`}>
                            {instrument}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-brand-primary hover:bg-brand-primary-dark text-white font-medium py-3 text-base"
            disabled={isLoading}
            data-testid="button-save-profile"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {mode === "create" ? "Creating Profile..." : "Saving Changes..."}
              </>
            ) : (
              mode === "create" ? "Complete Profile" : "Save Changes"
            )}
          </Button>

          {/* Help Text */}
          {mode === "create" && (
            <p className="text-center text-brand-neutral text-sm">
              Fields marked with * are required to get started
            </p>
          )}
        </form>
      </Form>
    </div>
  );
}