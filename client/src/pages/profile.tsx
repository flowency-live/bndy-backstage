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
import { PageContainer } from "@/components/layout/PageContainer";
import { InstallPrompt } from "@/components/InstallPrompt";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { Smartphone } from "lucide-react";
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
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const { canInstall } = useInstallPrompt();

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
    onSuccess: async (response) => {
      // Update cache immediately with the returned user data
      if (response.user) {
        queryClient.setQueryData(["/api/me"], { user: response.user, bands: [] });
      }

      // Invalidate ALL user-related queries to ensure UserContext refetches with fresh data
      // This prevents ProfileGate from seeing stale cached data and redirecting back to /profile
      await queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      await queryClient.invalidateQueries({ queryKey: ["users-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["api-memberships-me"] });

      toast({
        title: "Profile Updated",
        description: response.message || "Your profile has been updated successfully.",
      });

      // Check for pending invite token (user completing profile after invite)
      const pendingInvite = localStorage.getItem('pendingInvite');

      if (pendingInvite) {

        setLocation(`/invite/${pendingInvite}`);
        return;
      }

      // Always redirect to dashboard after profile completion
      setLocation("/dashboard");
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
    // Check if profile is complete - block navigation if not
    const hasRequiredFields = userProfile?.user.firstName &&
                             userProfile?.user.lastName &&
                             userProfile?.user.displayName;

    if (!hasRequiredFields) {
      toast({
        title: "Profile Required",
        description: "Please complete your profile to continue using bndy",
        variant: "destructive"
      });
      return; // Block navigation
    }

    // Profile complete - allow navigation
    setLocation("/dashboard");
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
    <PageContainer variant="narrow">
      <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
        {/* Profile Form Card with integrated back button */}
        <Card className="shadow-xl w-full relative">
          <CardContent className="p-6">
            {/* Install App button - top right corner */}
            {canInstall && (
              <button
                onClick={() => setShowInstallPrompt(true)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-brand-accent transition-colors flex items-center gap-2 text-sm"
                title="Add BNDY to home screen"
              >
                <Smartphone className="w-4 h-4" />
                <span className="hidden sm:inline">Install App</span>
              </button>
            )}

            {/* Only show back button if profile is complete (edit mode) */}
            {mode === "edit" && (
              <button
                onClick={handleCancel}
                className="text-muted-foreground hover:text-foreground transition-colors mb-4 flex items-center gap-2 text-sm"
                data-testid="button-back"
              >
                <i className="fas fa-arrow-left text-xs"></i>
                Back
              </button>
            )}
            <ProfileForm
              initialData={userProfile?.user ? {
                firstName: userProfile.user.firstName || "",
                lastName: userProfile.user.lastName || "",
                displayName: userProfile.user.displayName || "",
                hometown: userProfile.user.hometown || "",
                instrument: userProfile.user.instrument as any || undefined,
                avatarUrl: userProfile.user.avatarUrl || null,
                oauthProfilePicture: userProfile.user.oauthProfilePicture || null,
              } : undefined}
              onSubmit={handleProfileSubmit}
              isLoading={updateProfileMutation.isPending}
              mode={mode}
            />
          </CardContent>
        </Card>
      </div>

      {/* Install prompt modal */}
      <InstallPrompt
        isOpen={showInstallPrompt}
        onClose={() => setShowInstallPrompt(false)}
        title="Add BNDY to Your Home Screen"
        description="Get quick access to your band calendar, setlists, and more!"
      />
    </PageContainer>
  );
}