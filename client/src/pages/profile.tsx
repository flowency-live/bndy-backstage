import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerAuth } from "@/hooks/useServerAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  const { session, isAuthenticated } = useServerAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"create" | "edit">("create");

  // Profile page now respects theme system - no forced dark mode

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, setLocation]);

  // Fetch current user profile
  const { data: userProfile, isLoading: isLoadingProfile, error: profileError } = useQuery<UserProfileResponse>({
    queryKey: ["/api/me"],
    enabled: !!session?.access_token,
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
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await apiRequest("PUT", "/users/profile", data);
      return response.json();
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
      {/* Header */}
      <div className="bg-card/50 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={handleCancel}
              className="p-2 text-foreground hover:text-muted-foreground transition-colors"
              data-testid="button-back-header"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            
            
            <div className="w-10"> {/* Spacer for centering */}</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 pt-8">
        <div className="w-full max-w-md">
          {/* Title Section */}
          <div className="text-center mb-8">
            <div className="mb-4">
              <h1 className="text-3xl font-serif text-foreground mb-2">
                {mode === "create" ? "Complete Your Profile" : "Your Profile"}
              </h1>
            </div>
            <p className="text-muted-foreground">
              {mode === "create" 
                ? "Let's set up your profile to get started" 
                : "Update your profile information"
              }
            </p>
          </div>

          {/* Profile Form Card */}
          <Card className="shadow-xl">
            <CardContent className="p-6">
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

          {/* Cancel Button for Edit Mode */}
          {mode === "edit" && (
            <div className="text-center mt-4">
              <Button
                variant="ghost"
                onClick={handleCancel}
                className="text-muted-foreground hover:text-foreground hover:bg-muted"
                data-testid="button-cancel-profile"
              >
                Cancel Changes
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}