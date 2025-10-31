// src/lib/services/invites-service.ts
import { API_BASE_URL } from '../../config/api';

export interface Invite {
  token: string;
  artistId: string;
  inviteType: 'general' | 'phone-specific';
  status: 'active' | 'disabled' | 'expired';
  expiresAt: number;
  createdAt: string;
  acceptanceCount: number;
  acceptedBy?: Array<{
    userId: string;
    membershipId: string;
    acceptedAt: string;
  }>;
  lastAcceptedAt?: string;
  phone?: string;
  invitedByUserId: string;
  metadata: {
    artistName: string;
    inviterName?: string;
  };
}

class InvitesService {
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

    const response = await fetch(url, defaultOptions);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Create a general invite link for an artist
   */
  async createGeneralInvite(artistId: string): Promise<{
    success: boolean;
    inviteLink: string;
    token: string;
    expiresAt: number;
  }> {
    return this.apiRequest(`/api/artists/${artistId}/invites/general`, {
      method: 'POST',
    });
  }

  /**
   * Create a phone-specific invite
   */
  async createPhoneInvite(artistId: string, phone: string): Promise<{
    success: boolean;
    phone: string;
    inviteLink: string;
    token: string;
    expiresAt: number;
  }> {
    return this.apiRequest(`/api/artists/${artistId}/invites/phone`, {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  /**
   * List all invites for an artist
   */
  async listInvites(artistId: string): Promise<Invite[]> {
    return this.apiRequest(`/api/artists/${artistId}/invites`, {
      method: 'GET',
    });
  }

  /**
   * Disable/delete an invite
   */
  async disableInvite(token: string): Promise<{ success: boolean; message: string }> {
    return this.apiRequest(`/api/invites/${token}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get invite link URL
   */
  getInviteLink(token: string): string {
    return `https://backstage.bndy.co.uk/invite/${token}`;
  }
}

// Export singleton instance
export const invitesService = new InvitesService();
export default invitesService;
