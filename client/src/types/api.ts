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
export interface InsertUserProfile {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  phone?: string;
}

export interface UpdateUserProfile extends InsertUserProfile {
  id: string;
}

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

// Instrument options
export const INSTRUMENT_OPTIONS = [
  'vocals',
  'guitar',
  'bass',
  'drums',
  'keyboard',
  'piano',
  'saxophone',
  'trumpet',
  'violin',
  'other'
] as const;

// Zod schemas for validation
export const insertUserProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  displayName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export const updateUserProfileSchema = insertUserProfileSchema.extend({
  id: z.string(),
});