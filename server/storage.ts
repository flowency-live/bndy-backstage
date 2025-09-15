import { 
  type BandMember, type InsertBandMember, 
  type Event, type InsertEvent, 
  type Song, type InsertSong,
  type SongReadiness, type InsertSongReadiness,
  type SongVeto, type InsertSongVeto,
  type User, type InsertUser,
  type UserBand, type InsertUserBand,
  type Band, type InsertBand,
  bandMembers, events, songs, songReadiness, songVetos,
  users, userBands, bands
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUserBySupabaseId(supabaseId: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createOrGetUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  getUserBands(userId: string): Promise<(UserBand & { band: Band })[]>;
  getUserBandsBySupabaseId(supabaseId: string): Promise<(UserBand & { band: Band })[]>;
  
  // Band Members
  getBandMembers(): Promise<BandMember[]>;
  getBandMember(id: string): Promise<BandMember | undefined>;
  createBandMember(member: InsertBandMember): Promise<BandMember>;
  deleteBandMember(id: string): Promise<boolean>;
  
  // Events
  getEvents(): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  getEventsByDateRange(startDate: string, endDate: string): Promise<Event[]>;
  getEventsByMember(memberId: string): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<boolean>;
  deleteEventsByMember(memberId: string): Promise<void>;
  checkConflicts(data: { 
    date: string; 
    endDate?: string; 
    type: string; 
    memberId?: string;
    excludeEventId?: string; 
  }): Promise<{ 
    bandEventConflicts: Event[];
    unavailabilityConflicts: Event[];
    affectedBandEvents: Event[];
  }>;
  
  // Songs
  getSongs(): Promise<Song[]>;
  getSong(id: string): Promise<Song | undefined>;
  getSongBySpotifyId(spotifyId: string): Promise<Song | undefined>;
  createSong(song: InsertSong): Promise<Song>;
  deleteSong(id: string): Promise<boolean>;
  
  // Song Readiness
  getSongReadiness(songId: string): Promise<SongReadiness[]>;
  setSongReadiness(data: InsertSongReadiness): Promise<SongReadiness>;
  removeSongReadiness(songId: string, membershipId: string): Promise<boolean>;
  
  // Song Vetos
  getSongVetos(songId: string): Promise<SongVeto[]>;
  addSongVeto(data: InsertSongVeto): Promise<SongVeto>;
  removeSongVeto(songId: string, membershipId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUserBySupabaseId(supabaseId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.supabaseId, supabaseId));
    return user || undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createOrGetUser(insertUser: InsertUser): Promise<User> {
    // First, try to get existing user by supabaseId
    const existingUser = await this.getUserBySupabaseId(insertUser.supabaseId);
    if (existingUser) {
      return existingUser;
    }

    try {
      // Try to create the user
      return await this.createUser(insertUser);
    } catch (error: any) {
      // If it's a unique constraint violation, fetch the existing user
      if (error?.code === '23505' || error?.constraint?.includes('supabase_id')) {
        const user = await this.getUserBySupabaseId(insertUser.supabaseId);
        if (user) {
          return user;
        }
      }
      // Re-throw the error if it's not a unique constraint violation
      throw error;
    }
  }

  async updateUser(id: string, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser || undefined;
  }

  async getUserBands(userId: string): Promise<(UserBand & { band: Band })[]> {
    const result = await db
      .select({
        id: userBands.id,
        userId: userBands.userId,
        bandId: userBands.bandId,
        role: userBands.role,
        displayName: userBands.displayName,
        icon: userBands.icon,
        color: userBands.color,
        joinedAt: userBands.joinedAt,
        band: {
          id: bands.id,
          name: bands.name,
          slug: bands.slug,
          description: bands.description,
          avatarUrl: bands.avatarUrl,
          createdBy: bands.createdBy,
          createdAt: bands.createdAt,
          updatedAt: bands.updatedAt,
        }
      })
      .from(userBands)
      .innerJoin(bands, eq(userBands.bandId, bands.id))
      .where(eq(userBands.userId, userId));
    
    return result;
  }

  async getUserBandsBySupabaseId(supabaseId: string): Promise<(UserBand & { band: Band })[]> {
    const user = await this.getUserBySupabaseId(supabaseId);
    if (!user) {
      return [];
    }
    return this.getUserBands(user.id);
  }

  // Band Members
  async getBandMembers(): Promise<BandMember[]> {
    return await db.select().from(bandMembers);
  }

  async getBandMember(id: string): Promise<BandMember | undefined> {
    const [member] = await db.select().from(bandMembers).where(eq(bandMembers.id, id));
    return member || undefined;
  }

  async createBandMember(insertMember: InsertBandMember): Promise<BandMember> {
    const [member] = await db
      .insert(bandMembers)
      .values(insertMember)
      .returning();
    return member;
  }

  async deleteBandMember(id: string): Promise<boolean> {
    // Delete all events, song readiness, and song vetos associated with this member
    await this.deleteEventsByMember(id);
    await db.delete(songReadiness).where(eq(songReadiness.memberId, id));
    await db.delete(songVetos).where(eq(songVetos.memberId, id));
    
    const result = await db.delete(bandMembers).where(eq(bandMembers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Events
  async getEvents(): Promise<Event[]> {
    return await db.select().from(events);
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async getEventsByDateRange(startDate: string, endDate: string): Promise<Event[]> {
    const allEvents = await db.select().from(events);
    
    return allEvents.filter(event => {
      const eventDate = event.date;
      const eventEndDate = event.endDate || event.date;
      return eventDate <= endDate && eventEndDate >= startDate;
    });
  }

  async getEventsByMember(memberId: string): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.memberId, memberId));
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db
      .insert(events)
      .values(insertEvent)
      .returning();
    return event;
  }

  async updateEvent(id: string, updateData: Partial<InsertEvent>): Promise<Event | undefined> {
    const [updatedEvent] = await db
      .update(events)
      .set(updateData)
      .where(eq(events.id, id))
      .returning();
    
    return updatedEvent || undefined;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const result = await db.delete(events).where(eq(events.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteEventsByMember(memberId: string): Promise<void> {
    await db.delete(events).where(eq(events.memberId, memberId));
  }

  async checkConflicts(data: { 
    date: string; 
    endDate?: string; 
    type: string; 
    memberId?: string;
    excludeEventId?: string; 
  }): Promise<{ 
    bandEventConflicts: Event[];
    unavailabilityConflicts: Event[];
    affectedBandEvents: Event[];
  }> {
    const allEvents = await db.select().from(events);
    
    // Filter out the event being edited if provided
    const eventsToCheck = data.excludeEventId 
      ? allEvents.filter(event => event.id !== data.excludeEventId)
      : allEvents;
    
    // Check if dates overlap
    const checkStart = data.date;
    const checkEnd = data.endDate || data.date;
    
    const overlappingEvents = eventsToCheck.filter(event => {
      const eventStart = event.date;
      const eventEnd = event.endDate || event.date;
      return checkStart <= eventEnd && checkEnd >= eventStart;
    });
    
    let bandEventConflicts: Event[] = [];
    let unavailabilityConflicts: Event[] = [];
    let affectedBandEvents: Event[] = [];
    
    if (data.type === "practice" || data.type === "gig") {
      // For band events, check for other band events and member unavailability
      bandEventConflicts = overlappingEvents.filter(event => 
        event.type === "practice" || event.type === "gig"
      );
      
      unavailabilityConflicts = overlappingEvents.filter(event => 
        event.type === "unavailable"
      );
    } else if (data.type === "unavailable") {
      // For unavailability, check what band events this affects
      affectedBandEvents = overlappingEvents.filter(event => 
        event.type === "practice" || event.type === "gig"
      );
    }
    
    return { 
      bandEventConflicts,
      unavailabilityConflicts, 
      affectedBandEvents 
    };
  }

  // Songs
  async getSongs(): Promise<Song[]> {
    return await db.select().from(songs).orderBy(desc(songs.createdAt));
  }

  async getSong(id: string): Promise<Song | undefined> {
    const [song] = await db.select().from(songs).where(eq(songs.id, id));
    return song || undefined;
  }

  async getSongBySpotifyId(spotifyId: string): Promise<Song | undefined> {
    const [song] = await db.select().from(songs).where(eq(songs.spotifyId, spotifyId));
    return song || undefined;
  }

  async createSong(insertSong: InsertSong): Promise<Song> {
    const [song] = await db
      .insert(songs)
      .values(insertSong)
      .returning();
    return song;
  }

  async deleteSong(id: string): Promise<boolean> {
    // Delete associated readiness and vetos first
    await db.delete(songReadiness).where(eq(songReadiness.songId, id));
    await db.delete(songVetos).where(eq(songVetos.songId, id));
    
    const result = await db.delete(songs).where(eq(songs.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Song Readiness
  async getSongReadiness(songId: string): Promise<SongReadiness[]> {
    return await db.select().from(songReadiness).where(eq(songReadiness.songId, songId));
  }

  async setSongReadiness(data: InsertSongReadiness): Promise<SongReadiness> {
    // First, try to update existing readiness
    const [existing] = await db
      .select()
      .from(songReadiness)
      .where(and(
        eq(songReadiness.songId, data.songId),
        eq(songReadiness.membershipId, data.membershipId)
      ));

    if (existing) {
      const [updated] = await db
        .update(songReadiness)
        .set({ status: data.status, updatedAt: new Date() })
        .where(eq(songReadiness.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(songReadiness)
        .values(data)
        .returning();
      return created;
    }
  }

  async removeSongReadiness(songId: string, membershipId: string): Promise<boolean> {
    const result = await db
      .delete(songReadiness)
      .where(and(
        eq(songReadiness.songId, songId),
        eq(songReadiness.membershipId, membershipId)
      ));
    return (result.rowCount ?? 0) > 0;
  }

  // Song Vetos
  async getSongVetos(songId: string): Promise<SongVeto[]> {
    return await db.select().from(songVetos).where(eq(songVetos.songId, songId));
  }

  async addSongVeto(data: InsertSongVeto): Promise<SongVeto> {
    const [veto] = await db
      .insert(songVetos)
      .values(data)
      .returning();
    return veto;
  }

  async removeSongVeto(songId: string, membershipId: string): Promise<boolean> {
    const result = await db
      .delete(songVetos)
      .where(and(
        eq(songVetos.songId, songId),
        eq(songVetos.membershipId, membershipId)
      ));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();
