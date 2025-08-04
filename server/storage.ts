import { 
  type BandMember, type InsertBandMember, 
  type Event, type InsertEvent, 
  type Song, type InsertSong,
  type SongReadiness, type InsertSongReadiness,
  type SongVeto, type InsertSongVeto,
  bandMembers, events, songs, songReadiness, songVetos 
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
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
  removeSongReadiness(songId: string, memberId: string): Promise<boolean>;
  
  // Song Vetos
  getSongVetos(songId: string): Promise<SongVeto[]>;
  addSongVeto(data: InsertSongVeto): Promise<SongVeto>;
  removeSongVeto(songId: string, memberId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
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
        eq(songReadiness.memberId, data.memberId)
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

  async removeSongReadiness(songId: string, memberId: string): Promise<boolean> {
    const result = await db
      .delete(songReadiness)
      .where(and(
        eq(songReadiness.songId, songId),
        eq(songReadiness.memberId, memberId)
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

  async removeSongVeto(songId: string, memberId: string): Promise<boolean> {
    const result = await db
      .delete(songVetos)
      .where(and(
        eq(songVetos.songId, songId),
        eq(songVetos.memberId, memberId)
      ));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();
