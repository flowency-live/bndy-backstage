import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, uniqueIndex, check, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// New multi-tenant tables
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  supabaseId: text("supabase_id").notNull().unique(),
  phone: text("phone").unique(),
  email: text("email").unique(),
  // Profile fields - mandatory after authentication
  firstName: text("first_name"),
  lastName: text("last_name"),
  displayName: text("display_name"),
  hometown: text("hometown"), // Optional - UK Google Places autocomplete
  avatarUrl: text("avatar_url"),
  instrument: text("instrument"), // Optional - from predefined list
  // System fields
  platformAdmin: boolean("platform_admin").default(false), // Platform administrator role
  profileCompleted: boolean("profile_completed").default(false), // Track if mandatory profile fields are set
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const bands = pgTable("bands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  avatarUrl: text("avatar_url"),
  allowedEventTypes: text("allowed_event_types").array().default(sql`'{"practice","public_gig"}'`),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const userBands = pgTable("user_bands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  bandId: varchar("band_id").references(() => bands.id).notNull(),
  role: text("role").notNull(), // 'owner', 'admin', 'member'
  displayName: text("display_name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  avatarUrl: text("avatar_url"), // Optional member avatar URL
  joinedAt: timestamp("joined_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  uniqueUserBand: uniqueIndex('user_bands_user_band_unique').on(table.userId, table.bandId),
}));

export const invitations = pgTable("invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bandId: varchar("band_id").references(() => bands.id).notNull(),
  inviterMembershipId: varchar("inviter_membership_id").references(() => userBands.id).notNull(),
  contactInfo: text("contact_info").notNull(), // phone or email
  contactType: text("contact_type").notNull(), // 'phone' or 'email'
  role: text("role").notNull().default('member'),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  inviteeUserId: varchar("invitee_user_id").references(() => users.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Legacy single-band table (keep for migration)
export const bandMembers = pgTable("band_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  role: text("role").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
});

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bandId: varchar("band_id").references(() => bands.id), // XOR with ownerUserId - for band events
  ownerUserId: varchar("owner_user_id").references(() => users.id), // XOR with bandId - for user events
  type: text("type").notNull(), // 'practice', 'meeting', 'recording', 'private_booking', 'public_gig', 'festival', 'unavailable'
  title: text("title"),
  date: text("date").notNull(), // YYYY-MM-DD format
  endDate: text("end_date"), // Optional, for date ranges
  startTime: text("start_time"), // HH:MM format (24h)
  endTime: text("end_time"), // HH:MM format (24h)
  location: text("location"), // For private events
  venue: text("venue"), // For public events
  notes: text("notes"),
  isPublic: boolean("is_public").default(false), // true for public gigs/festivals, false for private events
  membershipId: varchar("membership_id").references(() => userBands.id), // null for band-wide events, used for user events
  memberId: varchar("member_id").references(() => bandMembers.id), // legacy - keep for migration
  isAllDay: boolean("is_all_day").default(false),
  createdByMembershipId: varchar("created_by_membership_id").references(() => userBands.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // XOR constraint: exactly one of bandId or ownerUserId must be non-null
  ownershipConstraint: check("ownership_xor", sql`(${table.bandId} IS NOT NULL AND ${table.ownerUserId} IS NULL) OR (${table.bandId} IS NULL AND ${table.ownerUserId} IS NOT NULL)`),
  // Indexes for efficient queries
  bandDateIndex: index('events_band_date_idx').on(table.bandId, table.date),
  userDateIndex: index('events_user_date_idx').on(table.ownerUserId, table.date),
  userDateRangeIndex: index('events_user_daterange_idx').on(table.ownerUserId, table.endDate),
}));

export const songs = pgTable("songs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bandId: varchar("band_id").references(() => bands.id), // nullable for migration
  spotifyId: text("spotify_id").notNull(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  album: text("album"),
  spotifyUrl: text("spotify_url").notNull(),
  imageUrl: text("image_url"),
  previewUrl: text("preview_url"),
  addedByMembershipId: varchar("added_by_membership_id").references(() => userBands.id),
  addedBy: varchar("added_by").references(() => bandMembers.id), // legacy - keep for migration
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  uniqueSpotifyPerBand: uniqueIndex('songs_band_spotify_unique').on(table.bandId, table.spotifyId),
}));

export const songReadiness = pgTable("song_readiness", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  songId: varchar("song_id").references(() => songs.id).notNull(),
  membershipId: varchar("membership_id").references(() => userBands.id).notNull(),
  memberId: varchar("member_id").references(() => bandMembers.id), // legacy - keep for migration
  status: text("status").notNull(), // 'red', 'amber', 'green'
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const songVetos = pgTable("song_vetos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  songId: varchar("song_id").references(() => songs.id).notNull(),
  membershipId: varchar("membership_id").references(() => userBands.id).notNull(),
  memberId: varchar("member_id").references(() => bandMembers.id), // legacy - keep for migration
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Calendar Integration tables
export const calendarIntegrations = pgTable("calendar_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  bandId: varchar("band_id").references(() => bands.id).notNull(),
  provider: text("provider").notNull(), // 'google_calendar', 'outlook', 'apple_calendar'
  calendarId: text("calendar_id").notNull(), // External calendar ID
  calendarName: text("calendar_name").notNull(),
  accessToken: text("access_token"), // Encrypted OAuth access token
  refreshToken: text("refresh_token"), // Encrypted OAuth refresh token
  tokenExpiresAt: timestamp("token_expires_at"),
  syncEnabled: boolean("sync_enabled").default(true),
  syncDirection: text("sync_direction").default('bidirectional'), // 'export_only', 'import_only', 'bidirectional'
  lastSyncAt: timestamp("last_sync_at"),
  syncErrors: text("sync_errors"), // JSON array of recent sync errors
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  uniqueUserBandCalendar: uniqueIndex('calendar_integrations_user_band_calendar_unique').on(
    table.userId, table.bandId, table.provider, table.calendarId
  ),
}));

export const calendarSyncEvents = pgTable("calendar_sync_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  calendarIntegrationId: varchar("calendar_integration_id").references(() => calendarIntegrations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  externalEventId: text("external_event_id").notNull(), // Event ID in external calendar
  externalEventEtag: text("external_event_etag"), // For change detection (Google Calendar)
  lastSyncedAt: timestamp("last_synced_at").default(sql`CURRENT_TIMESTAMP`),
  syncStatus: text("sync_status").default('synced'), // 'synced', 'pending', 'error', 'conflict'
  syncError: text("sync_error"), // Error message if sync failed
  conflictData: text("conflict_data"), // JSON data for conflict resolution
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  uniqueCalendarEvent: uniqueIndex('calendar_sync_events_calendar_event_unique').on(
    table.calendarIntegrationId, table.eventId
  ),
  uniqueExternalEvent: uniqueIndex('calendar_sync_events_external_event_unique').on(
    table.calendarIntegrationId, table.externalEventId
  ),
}));

// New multi-tenant relations
export const usersRelations = relations(users, ({ many }) => ({
  bands: many(userBands),
  createdBands: many(bands),
  personalEvents: many(events), // User's personal events (unavailable days, etc.)
  receivedInvitations: many(invitations, { relationName: "invitee" }),
  calendarIntegrations: many(calendarIntegrations),
}));

export const bandsRelations = relations(bands, ({ one, many }) => ({
  creator: one(users, {
    fields: [bands.createdBy],
    references: [users.id],
  }),
  members: many(userBands),
  events: many(events),
  songs: many(songs),
  invitations: many(invitations),
  calendarIntegrations: many(calendarIntegrations),
}));

export const userBandsRelations = relations(userBands, ({ one, many }) => ({
  user: one(users, {
    fields: [userBands.userId],
    references: [users.id],
  }),
  band: one(bands, {
    fields: [userBands.bandId],
    references: [bands.id],
  }),
  events: many(events, { relationName: "membershipEvents" }),
  createdEvents: many(events, { relationName: "createdEvents" }),
  addedSongs: many(songs),
  songReadiness: many(songReadiness),
  songVetos: many(songVetos),
  sentInvitations: many(invitations, { relationName: "inviter" }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  band: one(bands, {
    fields: [invitations.bandId],
    references: [bands.id],
  }),
  inviter: one(userBands, {
    relationName: "inviter",
    fields: [invitations.inviterMembershipId],
    references: [userBands.id],
  }),
  invitee: one(users, {
    relationName: "invitee",
    fields: [invitations.inviteeUserId],
    references: [users.id],
  }),
}));

// Legacy relations (keep for migration)
export const bandMembersRelations = relations(bandMembers, ({ many }) => ({
  unavailableEvents: many(events),
  addedSongs: many(songs),
  songReadiness: many(songReadiness),
  songVetos: many(songVetos),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  band: one(bands, {
    fields: [events.bandId],
    references: [bands.id],
  }),
  ownerUser: one(users, {
    fields: [events.ownerUserId],
    references: [users.id],
  }),
  membership: one(userBands, {
    relationName: "membershipEvents",
    fields: [events.membershipId],
    references: [userBands.id],
  }),
  createdBy: one(userBands, {
    relationName: "createdEvents",
    fields: [events.createdByMembershipId],
    references: [userBands.id],
  }),
  // Legacy relation (keep for migration)
  member: one(bandMembers, {
    fields: [events.memberId],
    references: [bandMembers.id],
  }),
}));

export const songsRelations = relations(songs, ({ one, many }) => ({
  band: one(bands, {
    fields: [songs.bandId],
    references: [bands.id],
  }),
  addedByMembership: one(userBands, {
    fields: [songs.addedByMembershipId],
    references: [userBands.id],
  }),
  readiness: many(songReadiness),
  vetos: many(songVetos),
  // Legacy relation (keep for migration)
  addedBy: one(bandMembers, {
    fields: [songs.addedBy],
    references: [bandMembers.id],
  }),
}));

export const songReadinessRelations = relations(songReadiness, ({ one }) => ({
  song: one(songs, {
    fields: [songReadiness.songId],
    references: [songs.id],
  }),
  membership: one(userBands, {
    fields: [songReadiness.membershipId],
    references: [userBands.id],
  }),
  // Legacy relation (keep for migration)
  member: one(bandMembers, {
    fields: [songReadiness.memberId],
    references: [bandMembers.id],
  }),
}));

export const songVetosRelations = relations(songVetos, ({ one }) => ({
  song: one(songs, {
    fields: [songVetos.songId],
    references: [songs.id],
  }),
  membership: one(userBands, {
    fields: [songVetos.membershipId],
    references: [userBands.id],
  }),
  // Legacy relation (keep for migration)
  member: one(bandMembers, {
    fields: [songVetos.memberId],
    references: [bandMembers.id],
  }),
}));

// Calendar Integration relations
export const calendarIntegrationsRelations = relations(calendarIntegrations, ({ one, many }) => ({
  user: one(users, {
    fields: [calendarIntegrations.userId],
    references: [users.id],
  }),
  band: one(bands, {
    fields: [calendarIntegrations.bandId],
    references: [bands.id],
  }),
  syncEvents: many(calendarSyncEvents),
}));

export const calendarSyncEventsRelations = relations(calendarSyncEvents, ({ one }) => ({
  calendarIntegration: one(calendarIntegrations, {
    fields: [calendarSyncEvents.calendarIntegrationId],
    references: [calendarIntegrations.id],
  }),
  event: one(events, {
    fields: [calendarSyncEvents.eventId],
    references: [events.id],
  }),
}));

// Constants for event types (must be defined before schemas that use them)
export const EVENT_TYPES = [
  'practice',
  'meeting', 
  'recording',
  'private_booking',
  'public_gig',
  'festival',
  'unavailable'
] as const;

// Event type configurations with icons and colors
export const EVENT_TYPE_CONFIG = {
  practice: { label: 'Practice', icon: '🎵', color: 'hsl(271, 91%, 65%)', theme: 'purple' },
  meeting: { label: 'Meeting', icon: '👥', color: 'hsl(220, 13%, 69%)', theme: 'neutral' },
  recording: { label: 'Recording', icon: '🎙️', color: 'hsl(0, 84%, 60%)', theme: 'red' },
  private_booking: { label: 'Private Booking', icon: '🔒', color: 'hsl(215, 28%, 17%)', theme: 'secure' },
  public_gig: { label: 'Gig', icon: '🎸', color: 'hsl(24, 95%, 53%)', theme: 'orange' },
  festival: { label: 'Festival', icon: '🎪', color: 'hsl(142, 76%, 36%)', theme: 'bright' },
  unavailable: { label: 'Unavailable', icon: '🚫', color: 'hsl(0, 0%, 50%)', theme: 'gray' }
} as const;

// New multi-tenant insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBandSchema = createInsertSchema(bands).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  allowedEventTypes: z.array(z.enum(EVENT_TYPES)).default(['practice', 'public_gig']).optional(),
});

// Define allowed event types for band configuration (excluding unavailable)
const BAND_EVENT_TYPES = [
  'practice',
  'meeting', 
  'recording',
  'private_booking',
  'public_gig',
  'festival'
] as const;

// Schema for updating band settings
export const updateBandSchema = z.object({
  name: z.string().min(1, "Band name is required").optional(),
  description: z.string().optional().nullable(),
  avatarUrl: z.string().url("Invalid avatar URL").optional().nullable(),
  allowedEventTypes: z.array(z.enum(BAND_EVENT_TYPES))
    .min(1, "At least one event type must be selected")
    .optional(),
});

export const insertUserBandSchema = createInsertSchema(userBands).omit({
  id: true,
  joinedAt: true,
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  token: true,
  acceptedAt: true,
  inviteeUserId: true,
  createdAt: true,
}).extend({
  expiresAt: z.date(),
});

// Legacy schema (keep for migration)
export const insertBandMemberSchema = createInsertSchema(bandMembers).omit({
  id: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
}).extend({
  bandId: z.string().optional().nullable(), // nullable for migration
  membershipId: z.string().optional().nullable(),
  createdByMembershipId: z.string().optional().nullable(),
  type: z.enum(EVENT_TYPES, { errorMap: () => ({ message: "Please select a valid event type" }) }),
  isPublic: z.boolean().optional().default(false),
  venue: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
});

export const insertSongSchema = createInsertSchema(songs).omit({
  id: true,
  createdAt: true,
}).extend({
  bandId: z.string().optional().nullable(), // nullable for migration
  addedByMembershipId: z.string().optional().nullable(),
  addedBy: z.string().optional().nullable(), // legacy
});

export const insertSongReadinessSchema = createInsertSchema(songReadiness).omit({
  id: true,
  updatedAt: true,
}).extend({
  membershipId: z.string(),
});

export const insertSongVetoSchema = createInsertSchema(songVetos).omit({
  id: true,
  createdAt: true,
}).extend({
  membershipId: z.string(),
});

// Calendar Integration schemas
export const insertCalendarIntegrationSchema = createInsertSchema(calendarIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncAt: true,
}).extend({
  provider: z.enum(['google_calendar', 'outlook', 'apple_calendar'], { 
    errorMap: () => ({ message: "Please select a valid calendar provider" }) 
  }),
  syncDirection: z.enum(['export_only', 'import_only', 'bidirectional']).default('bidirectional'),
  syncEnabled: z.boolean().default(true),
});

export const insertCalendarSyncEventSchema = createInsertSchema(calendarSyncEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncedAt: true,
}).extend({
  syncStatus: z.enum(['synced', 'pending', 'error', 'conflict']).default('pending'),
});

// Constants for profile fields
export const INSTRUMENT_OPTIONS = [
  'Lead Guitar',
  'Bass Guitar', 
  'Rhythm Guitar',
  'Guitar',
  'Keys',
  'Vocals',
  'Drums',
  'Saxophone',
  'Trumpet',
  'Violin',
  'Flute',
  'Other'
] as const;

// User profile schemas
export const insertUserProfileSchema = createInsertSchema(users).omit({
  id: true,
  supabaseId: true,
  platformAdmin: true,
  profileCompleted: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"), 
  displayName: z.string().min(1, "Display name is required"),
  hometown: z.string().min(1, "Hometown is required"),
  instrument: z.enum(INSTRUMENT_OPTIONS, { errorMap: () => ({ message: "Please select an instrument" }) }),
});

export const updateUserProfileSchema = insertUserProfileSchema.partial();

// New multi-tenant types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type InsertBand = z.infer<typeof insertBandSchema>;
export type UpdateBand = z.infer<typeof updateBandSchema>;
export type Band = typeof bands.$inferSelect;
export type InsertUserBand = z.infer<typeof insertUserBandSchema>;
export type UserBand = typeof userBands.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = typeof invitations.$inferSelect;

// Updated existing types
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
export type InsertSong = z.infer<typeof insertSongSchema>;
export type Song = typeof songs.$inferSelect;
export type InsertSongReadiness = z.infer<typeof insertSongReadinessSchema>;
export type SongReadiness = typeof songReadiness.$inferSelect;
export type InsertSongVeto = z.infer<typeof insertSongVetoSchema>;
export type SongVeto = typeof songVetos.$inferSelect;

// Calendar Integration types
export type InsertCalendarIntegration = z.infer<typeof insertCalendarIntegrationSchema>;
export type CalendarIntegration = typeof calendarIntegrations.$inferSelect;
export type InsertCalendarSyncEvent = z.infer<typeof insertCalendarSyncEventSchema>;
export type CalendarSyncEvent = typeof calendarSyncEvents.$inferSelect;

// Legacy types (keep for migration)
export type InsertBandMember = z.infer<typeof insertBandMemberSchema>;
export type BandMember = typeof bandMembers.$inferSelect;
