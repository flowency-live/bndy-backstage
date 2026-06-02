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
  locationType?: 'national' | 'region' | 'city';
  locationLat?: number | null;
  locationLng?: number | null;
  displayColour?: string; // Hex color for gig events on calendar (default: #f97316 Orange 500)
  genres?: string[];  // Flat list of genres (simplified 2025-11-07)
  artistType?: string; // camelCase version
  artist_type?: string; // Legacy snake_case version
  acoustic?: boolean;  // NEW: Indicates acoustic performance capability
  actType?: string[];  // NEW: Type of act (multiselect: originals, covers, tribute)
  publishAvailability?: boolean;  // NEW: Control whether availability is public on frontstage (default: false)
  showMemberVotes?: boolean;  // NEW: Show individual member votes when all votes are collected
  autoDiscardThreshold?: number | null;  // NEW: Auto-discard songs scoring below this % (null = disabled)
  profileImageUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  websiteUrl?: string | null;
  youtubeUrl?: string | null;
  spotifyUrl?: string | null;
  twitterUrl?: string | null;
  socialMediaUrls?: Array<{ type: string; url: string }>;
  isVerified?: boolean;
  followerCount?: number;
  memberCount?: number; // camelCase version (used by frontend)
  member_count?: number; // Legacy snake_case version (backend)
  allowedEventTypes?: string[];
  created_at: string;
  updated_at: string;
}

export interface ArtistMembership {
  // Frontend-expected format (camelCase, returned by API)
  id: string;
  joinedAt?: string;
  displayName?: string;
  avatarUrl?: string;
  // Backend fields (snake_case)
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
  /** Artist ID - Primary artist (first in list for multi-artist events) */
  artistId?: string;
  /** Collaborating artist IDs (additional artists beyond primary) */
  collaboratingArtistIds?: string[];
  /** All artist IDs (primary + collaborating, enriched by backend) */
  artistIds?: string[];
  /** All artist names (enriched by backend for display) */
  artistNames?: string[];
  /** Owner artist ID - who created/owns the event */
  ownerArtistId?: string;
  /** Source of event creation */
  source?: 'frontstage' | 'backstage';
  /** Owner User ID (cognito_id) - For user unavailability events */
  ownerUserId?: string;
  /** Membership ID - For artist-specific events */
  membershipId?: string;
  /** Event type - gig, rehearsal, other, unavailable */
  type: string;
  title: string;
  description?: string | null;
  notes?: string | null;
  /** Date in YYYY-MM-DD format */
  date: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  isAllDay?: boolean;
  isPublic?: boolean;
  location?: string | null;
  venue?: string | null;
  venueId?: string | null;
  /** Venue details enriched from bndy-venues table */
  venueAddress?: string | null;
  venueCity?: string | null;
  venueLatitude?: number | null;
  venueLongitude?: number | null;
  venueGooglePlaceId?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Display name for unavailability events (enriched by backend) */
  displayName?: string;
  /** Artist name for cross-artist events (single artist display) */
  artistName?: string;
  // Fee tracking fields (backstage only - stripped from public endpoints)
  /** Agreed fee in GBP */
  agreedFee?: number;
  /** Actual fee paid (defaults to agreedFee if not set) */
  actualFee?: number;
  /** Date payment was received (YYYY-MM-DD) */
  datePaid?: string;
  /** Payment method */
  paymentMethod?: 'cash' | 'bank_transfer' | 'gig_realm' | 'events_uk' | 'other';
  /** Whether fee is split equally between all artist members */
  splitBetweenMembers?: boolean;
  /** Gig has no guaranteed fee (e.g., bar takings, exposure gig) */
  noFee?: boolean;
  /** Whether the fee has been distributed to members (taken off balance) */
  distributed?: boolean;
}

export interface Song {
  id: string;
  artistId: string;
  title: string;
  /** Original artist (Elvis, Beatles, etc.) - NOT bndy artist context */
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
  'other',
  'unavailable'
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
  other: {
    label: 'Other',
    color: '#6b7280',
    icon: '📅'
  },
  unavailable: {
    label: 'Unavailable',
    color: '#ef4444',
    icon: '🚫'
  }
} as const;

// =============================================================================
// Expense/Finances Types
// =============================================================================

export const EXPENSE_CATEGORIES = [
  'equipment_purchase',
  'equipment_hire',
  'rehearsal_room',
  'studio_hire',
  'dep_fee',
  'member_payment',
  'marketing',
  'other'
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export const EXPENSE_CATEGORY_CONFIG = {
  equipment_purchase: { label: 'Equipment Purchase', icon: '🛒' },
  equipment_hire: { label: 'Equipment Hire', icon: '🔧' },
  rehearsal_room: { label: 'Rehearsal Room', icon: '🏠' },
  studio_hire: { label: 'Studio Hire', icon: '🎙️' },
  dep_fee: { label: 'Dep Fees', icon: '👤' },
  member_payment: { label: 'Member Payments', icon: '💰' },
  marketing: { label: 'Marketing', icon: '📣' },
  other: { label: 'Other', icon: '📝' }
} as const;

export const PAYMENT_METHODS = [
  'cash',
  'bank_transfer',
  'gig_realm',
  'events_uk',
  'other'
] as const;

export type PaymentMethod = typeof PAYMENT_METHODS[number];

export const PAYMENT_METHOD_CONFIG = {
  cash: { label: 'Cash' },
  bank_transfer: { label: 'Bank Transfer' },
  gig_realm: { label: 'Gig Realm' },
  events_uk: { label: 'Events UK' },
  other: { label: 'Other' }
} as const;

export interface Expense {
  id: string;
  artistId: string;
  /** Date of expense (YYYY-MM-DD) */
  date: string;
  /** Amount in GBP */
  amount: number;
  /** Category of expense */
  category: ExpenseCategory;
  /** Description (required for 'other' category) */
  description?: string;
  /** Membership ID of who paid */
  paidBy?: string;
  /** Related event ID (for gig-related expenses like member payments) */
  relatedEventId?: string;
  /** Group ID for grouped expenses (e.g., member payment splits) */
  groupId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Income categories for standalone income entries
export const INCOME_CATEGORIES = [
  'gig_payment',        // Linked to event (use Mark as Paid for this)
  'member_contribution', // Member adds to shared pot
  'tips',               // Tips/donations
  'merch',              // Merchandise sales
  'other'               // Other income
] as const;

export type IncomeCategory = typeof INCOME_CATEGORIES[number];

export const INCOME_CATEGORY_CONFIG = {
  gig_payment: { label: 'Gig Payment', icon: '🎵' },
  member_contribution: { label: 'Member Contribution', icon: '👥' },
  tips: { label: 'Tips', icon: '💵' },
  merch: { label: 'Merchandise', icon: '👕' },
  other: { label: 'Other', icon: '💰' }
} as const;

export interface Income {
  id: string;
  artistId: string;
  /** Date of income (YYYY-MM-DD) */
  date: string;
  /** Amount in GBP */
  amount: number;
  /** Category of income */
  category: IncomeCategory;
  /** Description */
  description?: string;
  /** Related event ID (for gig-linked income) */
  relatedEventId?: string;
  /** Member ID (for member contributions) */
  memberId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FinancesSummary {
  totalIncome: number;
  totalPaidIncome: number;
  totalUnpaidIncome: number;
  totalStandaloneIncome: number;
  totalGigIncome: number; // Gig revenue (even if distributed to members)
  totalExpenses: number;
  balance: number;
}

export interface FinancesResponse {
  summary: FinancesSummary;
  income: Array<{
    id: string;
    date: string;
    title: string;
    venueId?: string;
    venueName?: string | null;
    agreedFee?: number;
    actualFee?: number;
    datePaid?: string;
    paymentMethod?: PaymentMethod;
    splitBetweenMembers?: boolean;
    noFee?: boolean;
    distributed?: boolean;
    isPaid: boolean;
  }>;
  standaloneIncome: Income[];
  expenses: Expense[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

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

// Builder Types (Multi-persona / White-label subdomains)
export interface BuilderBranding {
  logoUrl?: string;
  tagline?: string;
}

export interface BuilderTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  foregroundColor: string;
  defaultMode: 'light' | 'dark';
}

export type BuilderCoverage =
  | { type: 'postcode_radius'; postcode: string; radius: number }
  | { type: 'postcode_areas'; areas: string[] }
  | { type: 'bounding_box'; sw: { lat: number; lng: number }; ne: { lat: number; lng: number } }
  | { type: 'manual' };

export interface Builder {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description?: string;
  branding: BuilderBranding;
  theme: BuilderTheme;
  coverage: BuilderCoverage;
  status: 'draft' | 'published' | 'suspended';
  created_at: string;
  updated_at: string;
}