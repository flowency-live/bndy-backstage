import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerAuth } from "@/hooks/useServerAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { usersService } from "@/lib/services/users-service";
import ProfileForm from "@/components/ui/profile-form";
import { useConditionalDarkMode } from "@/hooks/use-conditional-dark-mode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { User, InsertUserProfile, UpdateUserProfile } from "@/types/api";

interface UserProfileResponse {
  user: User;
  bands: any[];
}

export default function Profile() {
  const [, setLocation] = useLocation();
  const { session, isAuthenticated, loading } = useServerAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"create" | "edit">("create");

  // Profile page now respects theme system - no forced dark mode

  // Redirect if not authenticated (only after loading completes)
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [loading, isAuthenticated, setLocation]);

  // Fetch current user profile
  const { data: userProfile, isLoading: isLoadingProfile, error: profileError } = useQuery<UserProfileResponse>({
    queryKey: ["/api/me"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Determine mode based on profile completion
  useEffect(() => {
    if (userProfile?.user) {
      const hasRequiredFields = userProfile.user.firstName && 
                               userProfile.user.lastName && 
                               userProfile.user.displayName;
      setMode(hasRequiredFields ? "edit" : "create");
    }
  }, [userProfile]);

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: InsertUserProfile | UpdateUserProfile) => {
      return usersService.updateProfile(data);
    },
    onSuccess: (response) => {
      // Invalidate and refetch user profile
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      
      toast({
        title: "Profile Updated",
        description: response.message || "Your profile has been updated successfully.",
      });

      // If this was profile creation, redirect to dashboard or band selection
      if (mode === "create") {
        if (userProfile?.bands && userProfile.bands.length > 0) {
          setLocation("/dashboard");
        } else {
          setLocation("/onboarding");
        }
      } else {
        // If editing, go back to dashboard or previous page
        if (userProfile?.bands && userProfile.bands.length > 0) {
          setLocation("/dashboard");
        } else {
          setLocation("/");
        }
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update Profile",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleProfileSubmit = async (data: InsertUserProfile | UpdateUserProfile) => {
    updateProfileMutation.mutate(data);
  };

  const handleCancel = () => {
    if (mode === "edit") {
      // If editing, go back to previous page or dashboard
      if (userProfile?.bands && userProfile.bands.length > 0) {
        setLocation("/dashboard");
      } else {
        setLocation("/");
      }
    } else {
      // If creating for first time, go to landing
      setLocation("/");
    }
  };

  // Loading state
  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (profileError) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Profile Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              Failed to load your profile. Please try again.
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/me"] })}
                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0"
                data-testid="button-retry"
              >
                Retry
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCancel}
                className="flex-1"
                data-testid="button-back"
              >
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Main Content - no separate back arrow row */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Profile Form Card with integrated back button */}
          <Card className="shadow-xl">
            <CardContent className="p-6">
              {/* Subtle back link at top */}
              <button
                onClick={handleCancel}
                className="text-muted-foreground hover:text-foreground transition-colors mb-4 flex items-center gap-2 text-sm"
                data-testid="button-back"
              >
                <i className="fas fa-arrow-left text-xs"></i>
                Back
              </button>
              <ProfileForm
                initialData={userProfile?.user ? {
                  firstName: userProfile.user.firstName || "",
                  lastName: userProfile.user.lastName || "",
                  displayName: userProfile.user.displayName || "",
                  hometown: userProfile.user.hometown || "",
                  instrument: userProfile.user.instrument as any || undefined,
                  avatarUrl: userProfile.user.avatarUrl || null,
                } : undefined}
                onSubmit={handleProfileSubmit}
                isLoading={updateProfileMutation.isPending}
                mode={mode}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}