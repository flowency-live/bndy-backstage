import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// New multi-tenant tables
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  supabaseId: text("supabase_id").notNull().unique(),
  phone: text("phone").unique(),
  email: text("email").unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  platformAdmin: boolean("platform_admin").default(false), // Platform administrator role
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const bands = pgTable("bands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  avatarUrl: text("avatar_url"),
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
  bandId: varchar("band_id").references(() => bands.id), // nullable for migration
  type: text("type").notNull(), // 'practice', 'gig', 'unavailable'
  title: text("title"),
  date: text("date").notNull(), // YYYY-MM-DD format
  endDate: text("end_date"), // Optional, for date ranges
  startTime: text("start_time"), // HH:MM format (24h)
  endTime: text("end_time"), // HH:MM format (24h)
  location: text("location"),
  notes: text("notes"),
  membershipId: varchar("membership_id").references(() => userBands.id), // null for band-wide events
  memberId: varchar("member_id").references(() => bandMembers.id), // legacy - keep for migration
  isAllDay: boolean("is_all_day").default(false),
  createdByMembershipId: varchar("created_by_membership_id").references(() => userBands.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

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

// New multi-tenant relations
export const usersRelations = relations(users, ({ many }) => ({
  bands: many(userBands),
  createdBands: many(bands),
  receivedInvitations: many(invitations, { relationName: "invitee" }),
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

// New multi-tenant types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertBand = z.infer<typeof insertBandSchema>;
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

// Legacy types (keep for migration)
export type InsertBandMember = z.infer<typeof insertBandMemberSchema>;
export type BandMember = typeof bandMembers.$inferSelect;
