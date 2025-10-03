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
  avatarUrl?: string | null;
  oauthProfilePicture?: string | null;
  platformAdmin: boolean;
  profileCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Band {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserBand {
  id: string;
  userId: string;
  bandId: string;
  role: string;
  displayName?: string | null;
  icon?: string | null;
  color?: string | null;
  joinedAt: string;
  user: User;
  band: Band;
}

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