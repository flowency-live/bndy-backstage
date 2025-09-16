import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import BndyLogo from "@/components/ui/bndy-logo";
import ImageUpload from "@/components/ui/image-upload";
import { useForceDarkMode } from "@/hooks/use-force-dark-mode";

const ICONS = [
  { icon: "fa-microphone", color: "#D2691E", label: "Vocalist" },
  { icon: "fa-guitar", color: "#6B8E23", label: "Guitarist" },
  { icon: "fa-guitar", color: "#9932CC", label: "Bassist" },
  { icon: "fa-drum", color: "#DC143C", label: "Drummer" },
  { icon: "fa-piano", color: "#4169E1", label: "Keyboardist" },
  { icon: "fa-music", color: "#708090", label: "Multi-instrumentalist" },
  { icon: "fa-headphones", color: "#FF6347", label: "Producer" },
  { icon: "fa-crown", color: "#f59e0b", label: "Band Leader" },
];

export default function Onboarding() {
  // Force dark mode for branding consistency
  useForceDarkMode()
  
  const [, setLocation] = useLocation();
  const { session } = useSupabaseAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    bandName: "",
    bandDescription: "",
    bandAvatar: null as string | null,
    displayName: "",
    role: "",
    icon: "fa-music",
    color: "#708090",
  });

  const createBandMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      // Create the band
      const bandResponse = await fetch("/api/bands", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.bandName,
          description: data.bandDescription,
          avatarUrl: data.bandAvatar,
        }),
      });

      if (!bandResponse.ok) {
        throw new Error("Failed to create band");
      }

      const band = await bandResponse.json();
      return { band };
    },
    onSuccess: ({ band }) => {
      // Invalidate user profile to refetch bands
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      
      // Store the selected band ID
      localStorage.setItem('bndy-selected-band-id', band.id);
      
      toast({
        title: "Welcome to your band!",
        description: `${formData.bandName} has been created successfully.`,
      });
      
      // Redirect to calendar
      setLocation("/calendar");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create band",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.bandName.trim()) {
      toast({
        title: "Band name required",
        description: "Please enter a name for your band",
        variant: "destructive",
      });
      return;
    }

    if (!formData.displayName.trim()) {
      toast({
        title: "Display name required", 
        description: "Please enter your display name in the band",
        variant: "destructive",
      });
      return;
    }

    createBandMutation.mutate(formData);
  };

  const handleIconSelect = (iconData: typeof ICONS[0]) => {
    setFormData(prev => ({
      ...prev,
      icon: iconData.icon,
      color: iconData.color,
      role: prev.role || iconData.label, // Auto-fill role if empty
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 flex items-center justify-center">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mb-4" data-testid="logo-container">
            <div className="w-32 h-32 flex items-center justify-center mx-auto">
              <BndyLogo 
                className="w-24 h-24"
                color="#f97316"
                holeColor="rgb(51 65 85)" 
              />
            </div>
          </div>
          <h1 className="text-3xl font-serif text-foreground mb-2">Create Your Band</h1>
          <p className="text-muted-foreground text-base">Set up your band and get started organising gigs, rehearsals & music</p>
        </div>

        {/* Form */}
        <div className="bg-card rounded-xl p-6 shadow-xl border border-border">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Band Information */}
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-card-foreground mb-1">Band Information</h2>
            
            <div>
              <Label htmlFor="bandName" className="text-card-foreground font-medium mb-1 block">Band Name *</Label>
              <Input
                id="bandName"
                type="text"
                value={formData.bandName}
                onChange={(e) => setFormData(prev => ({ ...prev, bandName: e.target.value }))}
                placeholder="Enter your band name"
                className="mt-2"
                data-testid="input-band-name"
                required
              />
            </div>

            <div>
              <Label htmlFor="bandDescription" className="text-card-foreground font-medium mb-1 block">Description (Optional)</Label>
              <Textarea
                id="bandDescription"
                value={formData.bandDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, bandDescription: e.target.value }))}
                placeholder="Tell us about your band..."
                className="mt-2 resize-none"
                data-testid="input-band-description"
                rows={3}
              />
            </div>
          </div>

          {/* Your Profile in the Band */}
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-card-foreground mb-1">Your Profile</h2>
            
            <div>
              <Label htmlFor="displayName" className="text-card-foreground font-medium mb-1 block">Display Name *</Label>
              <Input
                id="displayName"
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="How you'll appear in the band"
                className="mt-2"
                data-testid="input-display-name"
                required
              />
            </div>

            <div>
              <Label htmlFor="role" className="text-card-foreground font-medium mb-1 block">Role</Label>
              <Input
                id="role"
                type="text"
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                placeholder="e.g., Lead Vocalist, Guitarist"
                className="mt-2"
                data-testid="input-role"
              />
            </div>

            {/* Band Avatar Upload */}
            <div>
              <Label className="text-card-foreground font-medium mb-2 block">Band Avatar (Optional)</Label>
              <p className="text-sm text-muted-foreground mb-3">Upload a logo or image for your band</p>
              <div className="flex justify-center">
                <ImageUpload
                  value={formData.bandAvatar || undefined}
                  onChange={(value) => setFormData(prev => ({ ...prev, bandAvatar: value }))}
                  placeholder="Upload band logo"
                  size="lg"
                  data-testid="band-avatar-upload"
                />
              </div>
            </div>

            {/* Member Icon Selection (for user profile) */}
            <div>
              <Label className="text-card-foreground font-medium mb-2 block">Choose Your Icon</Label>
              <p className="text-sm text-muted-foreground mb-3">This represents you within the band</p>
              <div className="grid grid-cols-4 gap-3 mt-3">
                {ICONS.map((iconData) => (
                  <button
                    key={iconData.icon}
                    type="button"
                    onClick={() => handleIconSelect(iconData)}
                    className={`p-3 rounded-lg border-2 transition-all hover:shadow-md hover:scale-105 ${
                      formData.icon === iconData.icon
                        ? 'border-orange-500 bg-orange-500/10 shadow-md scale-105'
                        : 'border-border hover:border-orange-500/50 hover:bg-muted'
                    }`}
                    data-testid={`button-icon-${iconData.icon}`}
                  >
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center mx-auto"
                      style={{ backgroundColor: iconData.color }}
                    >
                      <i className={`fas ${iconData.icon} text-primary-foreground text-sm`}></i>
                    </div>
                    <p className="text-xs mt-1 text-muted-foreground truncate">{iconData.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Color Preview */}
            <div className="flex items-center gap-3">
              <Label className="text-card-foreground font-medium">Your Color:</Label>
              <div 
                className="w-8 h-8 rounded-full border-2 border-border shadow-sm"
                style={{ backgroundColor: formData.color }}
              ></div>
              <span className="text-sm text-muted-foreground font-mono">{formData.color}</span>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-base font-medium shadow-sm"
            disabled={createBandMutation.isPending}
            data-testid="button-create-band"
          >
            {createBandMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Your Band...
              </>
            ) : (
              "Create Band & Continue"
            )}
          </Button>

          </form>

          {/* Back Link */}
          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => setLocation("/")}
              className="text-muted-foreground hover:text-foreground text-sm underline transition-colors font-medium"
              data-testid="button-back"
            >
              ← Back to Band Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}