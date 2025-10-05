// Frontend-only types for API responses (no Drizzle dependencies)
import { z } from 'zod';

export interface User {
  id: string;
  supabaseId: string;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  hometown?: string | null;
  instrument?: string | null;
  avatarUrl?: string | null;
  oauthProfilePicture?: string | null;
  platformAdmin: boolean;
  profileCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Artist {
  id: string;
  name: string;
  bio?: string | null;
  location?: string | null;
  genres?: string[];
  artist_type?: string;
  profileImageUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  websiteUrl?: string | null;
  socialMediaUrls?: Array<{ type: string; url: string }>;
  isVerified?: boolean;
  followerCount?: number;
  member_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ArtistMembership {
  membership_id: string;
  user_id: string;
  artist_id: string;
  role: string;
  membership_type: string;
  display_name?: string | null;
  avatar_url?: string | null;
  instrument?: string | null;
  bio?: string | null;
  icon?: string;
  color?: string;
  permissions?: string[];
  status: string;
  joined_at: string;
  invited_at?: string | null;
  invited_by_user_id?: string | null;
  created_at: string;
  updated_at: string;

  // Resolved fields (with inheritance from user profile)
  resolved_display_name?: string;
  resolved_avatar_url?: string;
  resolved_instrument?: string;
  has_custom_display_name?: boolean;
  has_custom_avatar?: boolean;
  has_custom_instrument?: boolean;

  // Full artist details when populated
  artist?: Artist;
  name?: string; // Artist name for convenience
}

// Legacy type aliases for backwards compatibility during migration
export type Band = Artist;
export type UserBand = ArtistMembership;

export interface Event {
  id: string;
  bandId: string;
  title: string;
  description?: string | null;
  eventType: string;
  startDateTime: string;
  endDateTime?: string | null;
  location?: string | null;
  isRecurring: boolean;
  recurringPattern?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Song {
  id: string;
  bandId: string;
  title: string;
  artist?: string | null;
  spotifyId?: string | null;
  youtubeId?: string | null;
  key?: string | null;
  bpm?: number | null;
  duration?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Event types and configurations
export const EVENT_TYPES = [
  'gig',
  'rehearsal',
  'recording',
  'meeting',
  'other'
] as const;

export type EventType = typeof EVENT_TYPES[number];

export const EVENT_TYPE_CONFIG = {
  gig: {
    label: 'Gig',
    color: '#10b981',
    icon: '🎵'
  },
  rehearsal: {
    label: 'Rehearsal',
    color: '#f59e0b',
    icon: '🎤'
  },
  recording: {
    label: 'Recording',
    color: '#ef4444',
    icon: '🎙️'
  },
  meeting: {
    label: 'Meeting',
    color: '#8b5cf6',
    icon: '💬'
  },
  other: {
    label: 'Other',
    color: '#6b7280',
    icon: '📅'
  }
} as const;

// Form types
export interface InsertEvent {
  title: string;
  description?: string;
  eventType: EventType;
  startDateTime: string;
  endDateTime?: string;
  location?: string;
  isRecurring?: boolean;
  recurringPattern?: string;
}

// Instrument options - must match backend
export const INSTRUMENT_OPTIONS = [
  'Vocals',
  'Guitar',
  'Bass',
  'Drums',
  'Keyboard',
  'Piano',
  'Saxophone',
  'Trumpet',
  'Violin',
  'Flute',
  'Other'
] as const;

// User profile schemas - must match backend validation
export const insertUserProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  displayName: z.string().min(1, "Display name is required"),
  hometown: z.string().min(1, "Hometown is required"),
  instrument: z.enum(INSTRUMENT_OPTIONS, { errorMap: () => ({ message: "Please select an instrument" }) }),
  avatarUrl: z.string().nullable().optional(),
});

export const updateUserProfileSchema = insertUserProfileSchema.partial();

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;