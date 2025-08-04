import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const bandMembers = pgTable("band_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  role: text("role").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
});

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'practice', 'gig', 'unavailable'
  title: text("title"),
  date: text("date").notNull(), // YYYY-MM-DD format
  endDate: text("end_date"), // Optional, for date ranges
  startTime: text("start_time"), // HH:MM format (24h)
  endTime: text("end_time"), // HH:MM format (24h)
  location: text("location"),
  notes: text("notes"),
  memberId: varchar("member_id").references(() => bandMembers.id),
  isAllDay: boolean("is_all_day").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const songs = pgTable("songs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  spotifyId: text("spotify_id").notNull().unique(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  album: text("album"),
  spotifyUrl: text("spotify_url").notNull(),
  imageUrl: text("image_url"),
  previewUrl: text("preview_url"),
  addedBy: varchar("added_by").references(() => bandMembers.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const songReadiness = pgTable("song_readiness", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  songId: varchar("song_id").references(() => songs.id).notNull(),
  memberId: varchar("member_id").references(() => bandMembers.id).notNull(),
  status: text("status").notNull(), // 'red', 'amber', 'green'
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const songVetos = pgTable("song_vetos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  songId: varchar("song_id").references(() => songs.id).notNull(),
  memberId: varchar("member_id").references(() => bandMembers.id).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Relations
export const bandMembersRelations = relations(bandMembers, ({ many }) => ({
  unavailableEvents: many(events),
  addedSongs: many(songs),
  songReadiness: many(songReadiness),
  songVetos: many(songVetos),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  member: one(bandMembers, {
    fields: [events.memberId],
    references: [bandMembers.id],
  }),
}));

export const songsRelations = relations(songs, ({ one, many }) => ({
  addedBy: one(bandMembers, {
    fields: [songs.addedBy],
    references: [bandMembers.id],
  }),
  readiness: many(songReadiness),
  vetos: many(songVetos),
}));

export const songReadinessRelations = relations(songReadiness, ({ one }) => ({
  song: one(songs, {
    fields: [songReadiness.songId],
    references: [songs.id],
  }),
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
  member: one(bandMembers, {
    fields: [songVetos.memberId],
    references: [bandMembers.id],
  }),
}));

export const insertBandMemberSchema = createInsertSchema(bandMembers).omit({
  id: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export const insertSongSchema = createInsertSchema(songs).omit({
  id: true,
  createdAt: true,
}).extend({
  addedBy: z.string().optional().nullable(),
});

export const insertSongReadinessSchema = createInsertSchema(songReadiness).omit({
  id: true,
  updatedAt: true,
});

export const insertSongVetoSchema = createInsertSchema(songVetos).omit({
  id: true,
  createdAt: true,
});

export type InsertBandMember = z.infer<typeof insertBandMemberSchema>;
export type BandMember = typeof bandMembers.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
export type InsertSong = z.infer<typeof insertSongSchema>;
export type Song = typeof songs.$inferSelect;
export type InsertSongReadiness = z.infer<typeof insertSongReadinessSchema>;
export type SongReadiness = typeof songReadiness.$inferSelect;
export type InsertSongVeto = z.infer<typeof insertSongVetoSchema>;
export type SongVeto = typeof songVetos.$inferSelect;
