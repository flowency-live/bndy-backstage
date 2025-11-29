// src/lib/services/auth-service.ts
import { API_BASE_URL } from '../../config/api';

export interface User {
  id: string;
  cognitoId: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  instrument?: string;
  hometown?: string;
  profileCompleted: boolean;
  createdAt: string;
}

export interface Band {
  id: string;
  name: string;
  role: string;
  status: string;
}

export interface AuthSession {
  user: User;
  bands: Band[];
  session: {
    issuedAt: number;
    expiresAt: number;
  };
}

export interface AuthResponse {
  user: User;
  bands: Band[];
  session: {
    issuedAt: number;
    expiresAt: number;
  };
}

class AuthService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Make authenticated API request with credentials
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultOptions: RequestInit = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);

      if (!response.ok) {
        // Try to parse error response body for API error messages
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // If JSON parsing fails, use the default error message
        }
        throw new Error(errorMessage);
      }

      // Handle empty responses (like logout)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Save session backup to localStorage for PWA/standalone mode
   */
  private saveSessionBackup(session: AuthResponse): void {
    try {
      localStorage.setItem('bndy-session-backup', JSON.stringify({
        userId: session.user.id,
        displayName: session.user.displayName,
        expiresAt: session.session.expiresAt,
        savedAt: Date.now()
      }));
    } catch (error) {
      // Silently fail if localStorage unavailable
    }
  }

  /**
   * Clear session backup from localStorage
   */
  private clearSessionBackup(): void {
    try {
      localStorage.removeItem('bndy-session-backup');
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Check current authentication status
   */
  async checkAuth(): Promise<AuthResponse | null> {
    try {
      const response = await this.apiRequest<AuthResponse>('/api/me');

      // Save session backup for PWA/standalone mode
      if (response) {
        this.saveSessionBackup(response);
      }

      return response;
    } catch (error) {
      // Clear backup on auth failure
      this.clearSessionBackup();
      return null;
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    this.clearSessionBackup();
    await this.apiRequest('/auth/logout', {
      method: 'POST',
    });
  }

  /**
   * Initiate Google OAuth flow
   */
  getGoogleAuthUrl(): string {
    return `${this.baseUrl}/auth/google`;
  }

  /**
   * Check if user session is valid based on expiry
   */
  isSessionValid(session: AuthSession): boolean {
    if (!session?.session?.expiresAt) {
      return false;
    }

    const now = Date.now();
    const expiresAt = session.session.expiresAt;

    // Add 5 minute buffer before expiry
    const bufferTime = 5 * 60 * 1000;

    return now < (expiresAt - bufferTime);
  }

  /**
   * Format user display name with fallbacks
   */
  getUserDisplayName(user: User): string {
    if (user.displayName) {
      return user.displayName;
    }

    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }

    if (user.firstName) {
      return user.firstName;
    }

    return user.username || user.email;
  }

  /**
   * Check if user profile is complete
   */
  isProfileComplete(user: User): boolean {
    return user.profileCompleted &&
           !!user.firstName &&
           !!user.lastName &&
           !!user.instrument;
  }

  /**
   * Request OTP for phone authentication
   */
  async requestPhoneOTP(phone: string): Promise<{ success: boolean; requestId: string; expiresIn: number }> {
    const response = await this.apiRequest<{
      success: boolean;
      requestId: string;
      expiresIn: number;
      message?: string;
      warning?: string;
    }>('/auth/phone/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
    return response;
  }

  /**
   * Verify phone OTP - logs in existing users or indicates new user needs onboarding
   */
  async verifyPhoneOTP(phone: string, otp: string): Promise<{
    success: boolean;
    phoneVerified?: boolean;
    requiresOnboarding?: boolean;
    user?: {
      id: string;
      phone: string;
      displayName: string;
      profileCompleted: boolean;
    };
  }> {
    const response = await this.apiRequest<{
      success: boolean;
      phoneVerified?: boolean;
      requiresOnboarding?: boolean;
      phone?: string;
      user?: {
        id: string;
        phone: string;
        displayName: string;
        profileCompleted: boolean;
      };
    }>('/auth/phone/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
    return response;
  }

  /**
   * Verify phone OTP and complete onboarding for new users
   */
  async verifyAndOnboard(
    phone: string,
    otp: string,
    firstName: string,
    lastName: string,
    hometown: string
  ): Promise<{
    success: boolean;
    user: {
      id: string;
      phone: string;
      displayName: string;
      hometown: string;
      profileCompleted: boolean;
    };
  }> {
    const response = await this.apiRequest<{
      success: boolean;
      user: {
        id: string;
        phone: string;
        displayName: string;
        hometown: string;
        profileCompleted: boolean;
      };
    }>('/auth/phone/verify-and-onboard', {
      method: 'POST',
      body: JSON.stringify({ phone, otp, firstName, lastName, hometown }),
    });
    return response;
  }

  /**
   * Request email magic link for authentication
   */
  async requestEmailMagicLink(email: string): Promise<{
    success: boolean;
    requestId: string;
    expiresIn: number;
  }> {
    const response = await this.apiRequest<{
      success: boolean;
      requestId: string;
      expiresIn: number;
      message?: string;
    }>('/auth/email/request-magic', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return response;
  }

  /**
   * Check if phone/email already exists (for welcome message)
   */
  async checkIdentity(phone?: string, email?: string): Promise<{
    exists: boolean;
    displayName?: string;
    method: 'phone' | 'email';
  }> {
    const response = await this.apiRequest<{
      exists: boolean;
      displayName?: string;
      method: 'phone' | 'email';
    }>('/auth/check-identity', {
      method: 'POST',
      body: JSON.stringify({ phone, email }),
    });
    return response;
  }

  /**
   * Get Apple OAuth URL
   */
  getAppleAuthUrl(): string {
    return `${this.baseUrl}/auth/apple`;
  }

  /**
   * Accept an artist invitation
   */
  async acceptInvite(token: string): Promise<{
    success: boolean;
    membership: {
      id: string;
      role: string;
      joinedAt: string;
    };
    artist: {
      id: string;
      name: string;
      profileImageUrl?: string;
    };
  }> {
    const response = await this.apiRequest<{
      success: boolean;
      membership: {
        id: string;
        role: string;
        joinedAt: string;
      };
      artist: {
        id: string;
        name: string;
        profileImageUrl?: string;
      };
    }>(`/api/invites/${token}/accept`, {
      method: 'POST',
    });
    return response;
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;