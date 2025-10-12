import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/lib/user-context";

interface ProfileGateProps {
  children: React.ReactNode;
}

/**
 * ProfileGate - Ensures user has completed their profile
 *
 * Separation of Concerns:
 * - MemberGate: Authentication and artist selection
 * - ProfileGate: Profile completion validation
 *
 * Redirects to /profile if required fields are missing
 */
export default function ProfileGate({ children }: ProfileGateProps) {
  const [, setLocation] = useLocation();
  const { userProfile, isLoading } = useUser();
  const [isRedirecting, setIsRedirecting] = useState(false);

  console.log('🔒 PROFILE GATE: Checking profile completion', {
    isLoading,
    hasUserProfile: !!userProfile,
    hasUser: !!userProfile?.user
  });

  useEffect(() => {
    // Wait for user data to load
    if (isLoading || !userProfile?.user) {
      console.log('🔒 PROFILE GATE: Waiting for user data...');
      return;
    }

    const user = userProfile.user;

    // Check if profile has required fields
    const hasRequiredFields = !!(
      user.firstName &&
      user.lastName &&
      user.displayName
    );

    const profileComplete = user.profileCompleted || hasRequiredFields;

    console.log('🔒 PROFILE GATE: Profile status', {
      firstName: !!user.firstName,
      lastName: !!user.lastName,
      displayName: !!user.displayName,
      profileCompleted: user.profileCompleted,
      hasRequiredFields,
      profileComplete
    });

    // Redirect to profile page if incomplete
    if (!profileComplete && !isRedirecting) {
      console.log('🔒 PROFILE GATE: ❌ Profile incomplete - redirecting to /profile');
      setIsRedirecting(true);
      setLocation('/profile');
    } else if (profileComplete) {
      console.log('🔒 PROFILE GATE: ✅ Profile complete - allowing access');
    }
  }, [userProfile, isLoading, setLocation, isRedirecting]);

  // Show loading while checking profile
  if (isLoading || isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-primary to-brand-primary-light p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-foreground mx-auto mb-4"></div>
          <p className="text-primary-foreground font-sans">Checking profile...</p>
        </div>
      </div>
    );
  }

  // Profile incomplete - will be handled by useEffect redirect
  if (!userProfile?.user) {
    return null;
  }

  const user = userProfile.user;
  const hasRequiredFields = !!(
    user.firstName &&
    user.lastName &&
    user.displayName
  );
  const profileComplete = user.profileCompleted || hasRequiredFields;

  if (!profileComplete) {
    return null;
  }

  // Profile complete - render children
  return <>{children}</>;
}
