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

// Relations
export const bandMembersRelations = relations(bandMembers, ({ many }) => ({
  unavailableEvents: many(events),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  member: one(bandMembers, {
    fields: [events.memberId],
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

export type InsertBandMember = z.infer<typeof insertBandMemberSchema>;
export type BandMember = typeof bandMembers.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
