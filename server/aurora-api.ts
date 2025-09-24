// Aurora API service - calls bndy-api for data that needs to be shared
// This maintains the clean architecture where only bndy-api connects to Aurora directly

const BNDY_API_URL = process.env.BNDY_API_URL || 'https://4kxjn4gjqj.eu-west-2.awsapprunner.com';

interface CreateUserData {
  supabaseId: string;
  phone?: string | null;
  email?: string | null;
  displayName?: string | null;
  firstName?: string;
  lastName?: string;
  hometown?: string;
  instrument?: string;
  avatarUrl?: string;
  platformAdmin?: boolean;
}

interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  hometown?: string;
  instrument?: string;
  avatarUrl?: string;
  platformAdmin?: boolean;
}

interface CreateBandData {
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string;
  allowedEventTypes?: string[];
  createdBy: string;
}

interface CreateMembershipData {
  userId: string;
  bandId: string;
  role: string;
  displayName: string;
  icon: string;
  color: string;
  avatarUrl?: string;
}

class AuroraApiService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = BNDY_API_URL;
  }

  // User management
  async createUser(userData: CreateUserData) {
    const response = await fetch(`${this.apiUrl}/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create user: ${error.error}`);
    }

    return response.json();
  }

  async updateUser(userId: string, updates: UpdateUserData) {
    const response = await fetch(`${this.apiUrl}/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to update user: ${error.error}`);
    }

    return response.json();
  }

  async getUserBySupabaseId(supabaseId: string) {
    const response = await fetch(`${this.apiUrl}/admin/users/by-supabase/${supabaseId}`);

    if (response.status === 404) {
      return null; // User not found
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get user: ${error.error}`);
    }

    return response.json();
  }

  // Band management (creates entries in artists table)
  async createBand(bandData: CreateBandData) {
    const response = await fetch(`${this.apiUrl}/admin/bands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bandData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create band: ${error.error}`);
    }

    return response.json();
  }

  async getUserBands(userId: string) {
    const response = await fetch(`${this.apiUrl}/admin/bands/user/${userId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get user bands: ${error.error}`);
    }

    return response.json();
  }

  // Band membership management
  async createMembership(membershipData: CreateMembershipData) {
    const response = await fetch(`${this.apiUrl}/admin/user-bands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(membershipData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create membership: ${error.error}`);
    }

    return response.json();
  }

  async getBandMembers(bandId: string) {
    const response = await fetch(`${this.apiUrl}/admin/bands/${bandId}/members`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get band members: ${error.error}`);
    }

    return response.json();
  }

  // Event management
  async createEvent(eventData: any) {
    const response = await fetch(`${this.apiUrl}/admin/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create event: ${error.error}`);
    }

    return response.json();
  }

  async updateEvent(eventId: string, updates: any) {
    const response = await fetch(`${this.apiUrl}/admin/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to update event: ${error.error}`);
    }

    return response.json();
  }

  async deleteEvent(eventId: string) {
    const response = await fetch(`${this.apiUrl}/admin/events/${eventId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to delete event: ${error.error}`);
    }

    return response.json();
  }

  async getBandEvents(bandId: string) {
    const response = await fetch(`${this.apiUrl}/admin/events/band/${bandId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get band events: ${error.error}`);
    }

    return response.json();
  }
}

export const auroraApi = new AuroraApiService();