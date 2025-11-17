// src/lib/services/users-service.ts
import { API_BASE_URL } from '../../config/api';

export interface User {
  id: string;
  supabaseId?: string;
  cognitoId?: string;
  username?: string;
  email: string;
  phone?: string | null;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  instrument?: string;
  hometown?: string;
  profileCompleted?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface UserProfileUpdate {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string | null;
  instrument?: string;
  hometown?: string;
}

export interface UserProfileResponse {
  user: User;
  bands: any[];
}

export interface ProfileUpdateResponse {
  success: boolean;
  message: string;
  user?: User;
}

class UsersService {
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
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return {} as T;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current user profile (via /api/me)
   */
  async getCurrentProfile(): Promise<UserProfileResponse> {
    return this.apiRequest<UserProfileResponse>('/api/me');
  }

  /**
   * Get user profile (via /users/profile)
   * Returns { user: User } structure
   */
  async getProfile(): Promise<{ user: User }> {
    return this.apiRequest<{ user: User }>('/users/profile');
  }

  /**
   * Update user profile
   */
  async updateProfile(profileData: UserProfileUpdate): Promise<ProfileUpdateResponse> {
    return this.apiRequest<ProfileUpdateResponse>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(): Promise<User[]> {
    return this.apiRequest<User[]>('/users');
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User> {
    return this.apiRequest<User>(`/users/${userId}`);
  }
}

// Export singleton instance
export const usersService = new UsersService();
export default usersService;