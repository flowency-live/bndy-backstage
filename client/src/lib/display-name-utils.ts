/**
 * Utility functions for formatting display names
 */

/**
 * Formats a display name by masking auto-generated social auth usernames
 * @param displayName - The raw display name (could be signinwithapple_xxx, signinwithgoogle_xxx, etc)
 * @param provider - Optional provider hint for better masking
 * @returns A user-friendly display name
 */
export function formatDisplayName(displayName: string | undefined | null, provider?: string): string {
  if (!displayName) {
    return "New User";
  }

  // Check for Cognito auto-generated social auth usernames
  if (displayName.startsWith("signinwithapple_")) {
    return "Apple User";
  }

  if (displayName.startsWith("signinwithgoogle_")) {
    return "Google User";
  }

  if (displayName.startsWith("facebook_")) {
    return "Facebook User";
  }

  // If it looks like a temporary username (long alphanumeric), mask it
  if (/^[a-z0-9_]{20,}$/i.test(displayName)) {
    return "New User";
  }

  // Otherwise return the display name as-is
  return displayName;
}

/**
 * Checks if a display name is a temporary auto-generated one
 */
export function isTemporaryDisplayName(displayName: string | undefined | null): boolean {
  if (!displayName) return true;

  return (
    displayName.startsWith("signinwithapple_") ||
    displayName.startsWith("signinwithgoogle_") ||
    displayName.startsWith("facebook_") ||
    /^[a-z0-9_]{20,}$/i.test(displayName)
  );
}
