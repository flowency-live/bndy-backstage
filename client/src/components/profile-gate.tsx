import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import type { User, ArtistMembership } from "@/types/api";

interface UserProfile {
  user: User;
  artists: ArtistMembership[];
}

interface ProfileGateProps {
  children: React.ReactNode;
  userProfile: UserProfile | null;
}

/**
 * ProfileGate - Simple redirect guard for profile completion
 *
 * Separation of Concerns:
 * - MemberGate: Authentication, loading states, artist selection
 * - ProfileGate: Profile completion validation (redirect only, no loading UI)
 *
 * NOTE: ProfileGate must be used INSIDE MemberGate's children function.
 * MemberGate handles all loading states - ProfileGate just checks and redirects.
 */
export default function ProfileGate({ children, userProfile }: ProfileGateProps) {
  const [, setLocation] = useLocation();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Only check once when userProfile is available
    if (!userProfile?.user || hasChecked) return;

    const user = userProfile.user;

    // Check if profile has required fields
    const hasRequiredFields = !!(
      user.firstName &&
      user.lastName &&
      user.displayName
    );

    const profileComplete = user.profileCompleted || hasRequiredFields;

    console.log('🔒 PROFILE GATE: Checking profile', {
      firstName: !!user.firstName,
      lastName: !!user.lastName,
      displayName: !!user.displayName,
      profileComplete
    });

    // Redirect to profile page if incomplete
    if (!profileComplete) {
      console.log('🔒 PROFILE GATE: ❌ Profile incomplete - redirecting to /profile');
      setLocation('/profile');
    } else {
      console.log('🔒 PROFILE GATE: ✅ Profile complete - allowing access');
    }

    setHasChecked(true);
  }, [userProfile, hasChecked, setLocation]);

  // If no userProfile yet, render nothing (MemberGate shows loading)
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

  // If profile incomplete, render nothing (redirect will happen in useEffect)
  if (!profileComplete) {
    return null;
  }

  // Profile complete - render children
  return <>{children}</>;
}
