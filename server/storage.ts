import {
  type BandMember, type InsertBandMember,
  type Event, type InsertEvent,
  type Song, type InsertSong,
  type SongReadiness, type InsertSongReadiness,
  type SongVeto, type InsertSongVeto,
  type User, type InsertUser,
  type UserBand, type InsertUserBand,
  type Band, type InsertBand,
} from "@shared/schema";

export interface IStorage {
  // Users - no band scoping needed
  getUserBySupabaseId(supabaseId: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUsersByPhone(phone: string): Promise<User[]>;
  getUsersByEmail(email: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  createOrGetUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  getUserBands(userId: string): Promise<(UserBand & { band: Band })[]>;
  getUserBandsBySupabaseId(supabaseId: string): Promise<(UserBand & { band: Band })[]>;
  
  // Band management - new multi-tenant operations
  createBand(band: InsertBand, creatorUserId: string): Promise<Band>;
  getBand(bandId: string): Promise<Band | undefined>;
  updateBand(bandId: string, updates: Partial<InsertBand>): Promise<Band | undefined>;
  deleteBand(bandId: string): Promise<boolean>;
  getTotalBandsCount(): Promise<number>;
  
  // Band membership management
  addUserToBand(userId: string, bandId: string, membership: Omit<InsertUserBand, 'userId' | 'bandId'>): Promise<UserBand>;
  removeUserFromBand(userId: string, bandId: string): Promise<boolean>;
  updateUserBandRole(userId: string, bandId: string, role: string): Promise<UserBand | undefined>;
  updateMemberAvatar(membershipId: string, avatarUrl: string | null): Promise<UserBand | undefined>;
  getBandMembers(bandId: string): Promise<(UserBand & { user: User })[]>;
  
  // Legacy Band Members - keep during migration
  getBandMembersLegacy(): Promise<BandMember[]>;
  getBandMemberLegacy(id: string): Promise<BandMember | undefined>;
  createBandMemberLegacy(member: InsertBandMember): Promise<BandMember>;
  deleteBandMemberLegacy(id: string): Promise<boolean>;
  
  // Events - now band-scoped
  getEvents(bandId: string): Promise<Event[]>;
  getEvent(bandId: string, eventId: string): Promise<Event | undefined>;
  getEventsByDateRange(bandId: string, startDate: string, endDate: string): Promise<Event[]>;
  getEventsByMembership(bandId: string, membershipId: string): Promise<Event[]>;
  createEvent(bandId: string, event: Omit<InsertEvent, 'bandId'>): Promise<Event>;
  updateEvent(bandId: string, eventId: string, event: Partial<Omit<InsertEvent, 'bandId'>>): Promise<Event | undefined>;
  deleteEvent(bandId: string, eventId: string): Promise<boolean>;
  deleteEventsByMembership(bandId: string, membershipId: string): Promise<void>;
  checkConflicts(bandId: string, data: { 
    date: string; 
    endDate?: string; 
    type: string; 
    membershipId?: string;
    excludeEventId?: string; 
  }): Promise<{ 
    bandEventConflicts: Event[];
    unavailabilityConflicts: Event[];
    affectedBandEvents: Event[];
  }>;
  
  // User events (personal events like unavailable days)
  getUserEvents(userId: string): Promise<Event[]>;
  getUserEventsByDateRange(userId: string, startDate: string, endDate: string): Promise<Event[]>;
  createUserEvent(userId: string, event: Omit<InsertEvent, 'ownerUserId'>): Promise<Event>;
  updateUserEvent(userId: string, eventId: string, event: Partial<Omit<InsertEvent, 'ownerUserId'>>): Promise<Event | undefined>;
  deleteUserEvent(userId: string, eventId: string): Promise<boolean>;
  
  // Cross-band events (events from other bands user is a member of)
  getOtherBandEvents(userId: string, excludeBandId: string): Promise<(Event & { bandName: string })[]>;
  getOtherBandEventsByDateRange(userId: string, excludeBandId: string, startDate: string, endDate: string): Promise<(Event & { bandName: string })[]>;
  
  // Unified calendar (all events for a band's calendar view)
  getUnifiedCalendar(bandId: string, startDate: string, endDate: string): Promise<{
    bandEvents: Event[];
    userEvents: Event[];
    otherBandEvents: (Event & { bandName: string })[];
  }>;
  
  // Legacy Events - keep during migration
  getEventsLegacy(): Promise<Event[]>;
  getEventLegacy(id: string): Promise<Event | undefined>;
  getEventsByDateRangeLegacy(startDate: string, endDate: string): Promise<Event[]>;
  getEventsByMemberLegacy(memberId: string): Promise<Event[]>;
  deleteEventsByMemberLegacy(memberId: string): Promise<void>;
  
  // Songs - now band-scoped
  getSongs(bandId: string): Promise<Song[]>;
  getSong(bandId: string, songId: string): Promise<Song | undefined>;
  getSongBySpotifyId(bandId: string, spotifyId: string): Promise<Song | undefined>;
  createSong(bandId: string, song: Omit<InsertSong, 'bandId'>): Promise<Song>;
  deleteSong(bandId: string, songId: string): Promise<boolean>;
  
  // Legacy Songs - keep during migration
  getSongsLegacy(): Promise<Song[]>;
  getSongLegacy(id: string): Promise<Song | undefined>;
  getSongBySpotifyIdLegacy(spotifyId: string): Promise<Song | undefined>;
  
  // Song Readiness - band-scoped through songId verification
  getSongReadiness(bandId: string, songId: string): Promise<SongReadiness[]>;
  setSongReadiness(bandId: string, data: Omit<InsertSongReadiness, 'membershipId'> & { membershipId: string }): Promise<SongReadiness>;
  removeSongReadiness(bandId: string, songId: string, membershipId: string): Promise<boolean>;
  
  // Song Vetos - band-scoped through songId verification
  getSongVetos(bandId: string, songId: string): Promise<SongVeto[]>;
  addSongVeto(bandId: string, data: Omit<InsertSongVeto, 'membershipId'> & { membershipId: string }): Promise<SongVeto>;
  removeSongVeto(bandId: string, songId: string, membershipId: string): Promise<boolean>;
  
  // Invite token validation
  validateInviteToken(token: string): Promise<{ isValid: boolean; invitation?: any; error?: string }>;
  acceptInviteToken(token: string, userId: string, userDisplayName: string): Promise<{ success: boolean; bandId?: string; error?: string }>;
}

const BNDY_API_URL = process.env.BNDY_API_URL || 'https://4kxjn4gjqj.eu-west-2.awsapprunner.com';

export class ApiStorage implements IStorage {
  // Users
  async getUserBySupabaseId(supabaseId: string): Promise<User | undefined> {
    try {
      const response = await fetch(`${BNDY_API_URL}/admin/users/by-supabase/${supabaseId}`);
      if (response.status === 404) {
        return undefined;
      }
      if (!response.ok) {
        throw new Error(`Failed to get user: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get user by supabase ID:', error);
      return undefined;
    }
  }

  async getUserById(id: string): Promise<User | undefined> {
    try {
      const response = await fetch(`${BNDY_API_URL}/admin/users/${id}`);
      if (response.status === 404) {
        return undefined;
      }
      if (!response.ok) {
        throw new Error(`Failed to get user: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get user by ID:', error);
      return undefined;
    }
  }

  async getUsersByPhone(phone: string): Promise<User[]> {
    try {
      const response = await fetch(`${BNDY_API_URL}/admin/users/by-phone/${encodeURIComponent(phone)}`);
      if (response.status === 404) {
        return [];
      }
      if (!response.ok) {
        throw new Error(`Failed to get users by phone: ${response.statusText}`);
      }
      const result = await response.json();
      return Array.isArray(result) ? result : [result];
    } catch (error) {
      console.error('Failed to get users by phone:', error);
      return [];
    }
  }

  async getUsersByEmail(email: string): Promise<User[]> {
    try {
      const response = await fetch(`${BNDY_API_URL}/admin/users/by-email/${encodeURIComponent(email)}`);
      if (response.status === 404) {
        return [];
      }
      if (!response.ok) {
        throw new Error(`Failed to get users by email: ${response.statusText}`);
      }
      const result = await response.json();
      return Array.isArray(result) ? result : [result];
    } catch (error) {
      console.error('Failed to get users by email:', error);
      return [];
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const response = await fetch(`${BNDY_API_URL}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(insertUser),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create user: ${error.error}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }

  async createOrGetUser(insertUser: InsertUser): Promise<User> {
    // First, try to get existing user
    const existingUser = await this.getUserBySupabaseId(insertUser.supabaseId);
    if (existingUser) {
      return existingUser;
    }

    try {
      return await this.createUser(insertUser);
    } catch (error: any) {
      // If creation fails due to duplicate, try to fetch again
      const user = await this.getUserBySupabaseId(insertUser.supabaseId);
      if (user) {
        return user;
      }
      throw error;
    }
  }

  async updateUser(id: string, updateData: Partial<InsertUser>): Promise<User | undefined> {
    try {
      console.log(`[DEBUG] Calling PUT ${BNDY_API_URL}/admin/users/${id} with data:`, updateData);
      const response = await fetch(`${BNDY_API_URL}/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      console.log(`[DEBUG] PUT response status: ${response.status}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`[DEBUG] PUT response error:`, errorText);
        return undefined;
      }
      const result = await response.json();
      console.log(`[DEBUG] PUT response success:`, result);
      return result;
    } catch (error) {
      console.error('Failed to update user:', error);
      return undefined;
    }
  }

  async getUserBands(userId: string): Promise<(UserBand & { band: Band })[]> {
    try {
      const response = await fetch(`${BNDY_API_URL}/admin/bands/user/${userId}`);
      if (!response.ok) {
        console.error('Failed to get user bands:', response.statusText);
        return [];
      }
      const bands = await response.json();

      // Convert Aurora response to expected format
      return bands.map((ab: any) => ({
        id: ab.membershipId,
        userId: userId,
        bandId: ab.id,
        role: ab.role,
        displayName: ab.displayName,
        icon: ab.icon,
        color: ab.color,
        avatarUrl: ab.avatarUrl,
        joinedAt: new Date(ab.joinedAt),
        band: {
          id: ab.id,
          name: ab.name,
          slug: ab.slug,
          description: ab.description,
          avatarUrl: ab.avatarUrl,
          allowedEventTypes: ab.allowedEventTypes,
          createdBy: ab.createdBy,
          createdAt: new Date(ab.createdAt || new Date()),
          updatedAt: new Date(ab.updatedAt || new Date()),
        }
      }));
    } catch (error) {
      console.error('Failed to get user bands:', error);
      return [];
    }
  }

  async getUserBandsBySupabaseId(supabaseId: string): Promise<(UserBand & { band: Band })[]> {
    const user = await this.getUserBySupabaseId(supabaseId);
    if (!user) {
      return [];
    }
    return this.getUserBands(user.id);
  }

  // Legacy Band Members - renamed from original methods
  async getBandMembersLegacy(): Promise<BandMember[]> {
    return await db.select().from(bandMembers);
  }

  async getBandMemberLegacy(id: string): Promise<BandMember | undefined> {
    const [member] = await db.select().from(bandMembers).where(eq(bandMembers.id, id));
    return member || undefined;
  }

  async createBandMemberLegacy(insertMember: InsertBandMember): Promise<BandMember> {
    const [member] = await db
      .insert(bandMembers)
      .values(insertMember)
      .returning();
    return member;
  }

  async deleteBandMemberLegacy(id: string): Promise<boolean> {
    // Delete all events, song readiness, and song vetos associated with this member
    await this.deleteEventsByMemberLegacy(id);
    await db.delete(songReadiness).where(eq(songReadiness.memberId, id));
    await db.delete(songVetos).where(eq(songVetos.memberId, id));
    
    const result = await db.delete(bandMembers).where(eq(bandMembers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Legacy Events - renamed from original methods
  async getEventsLegacy(): Promise<Event[]> {
    return await db.select().from(events);
  }

  async getEventLegacy(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async getEventsByDateRangeLegacy(startDate: string, endDate: string): Promise<Event[]> {
    const allEvents = await db.select().from(events);
    
    return allEvents.filter(event => {
      const eventDate = event.date;
      const eventEndDate = event.endDate || event.date;
      return eventDate <= endDate && eventEndDate >= startDate;
    });
  }

  async getEventsByMemberLegacy(memberId: string): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.memberId, memberId));
  }

  async createEventLegacy(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db
      .insert(events)
      .values(insertEvent)
      .returning();
    return event;
  }

  async updateEventLegacy(id: string, updateData: Partial<InsertEvent>): Promise<Event | undefined> {
    const [updatedEvent] = await db
      .update(events)
      .set(updateData)
      .where(eq(events.id, id))
      .returning();
    
    return updatedEvent || undefined;
  }

  async deleteEventLegacy(id: string): Promise<boolean> {
    const result = await db.delete(events).where(eq(events.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteEventsByMemberLegacy(memberId: string): Promise<void> {
    await db.delete(events).where(eq(events.memberId, memberId));
  }

  async checkConflictsLegacy(data: { 
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

  // Legacy Songs - renamed from original methods
  async getSongsLegacy(): Promise<Song[]> {
    return await db.select().from(songs).orderBy(desc(songs.createdAt));
  }

  async getSongLegacy(id: string): Promise<Song | undefined> {
    const [song] = await db.select().from(songs).where(eq(songs.id, id));
    return song || undefined;
  }

  async getSongBySpotifyIdLegacy(spotifyId: string): Promise<Song | undefined> {
    const [song] = await db.select().from(songs).where(eq(songs.spotifyId, spotifyId));
    return song || undefined;
  }

  async createSongLegacy(insertSong: InsertSong): Promise<Song> {
    const [song] = await db
      .insert(songs)
      .values(insertSong)
      .returning();
    return song;
  }

  async deleteSongLegacy(id: string): Promise<boolean> {
    // Delete associated readiness and vetos first
    await db.delete(songReadiness).where(eq(songReadiness.songId, id));
    await db.delete(songVetos).where(eq(songVetos.songId, id));
    
    const result = await db.delete(songs).where(eq(songs.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Legacy Song Readiness - renamed from original methods
  async getSongReadinessLegacy(songId: string): Promise<SongReadiness[]> {
    return await db.select().from(songReadiness).where(eq(songReadiness.songId, songId));
  }

  async setSongReadinessLegacy(data: InsertSongReadiness): Promise<SongReadiness> {
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

  async removeSongReadinessLegacy(songId: string, membershipId: string): Promise<boolean> {
    const result = await db
      .delete(songReadiness)
      .where(and(
        eq(songReadiness.songId, songId),
        eq(songReadiness.membershipId, membershipId)
      ));
    return (result.rowCount ?? 0) > 0;
  }

  // Legacy Song Vetos - renamed from original methods
  async getSongVetosLegacy(songId: string): Promise<SongVeto[]> {
    return await db.select().from(songVetos).where(eq(songVetos.songId, songId));
  }

  async addSongVetoLegacy(data: InsertSongVeto): Promise<SongVeto> {
    const [veto] = await db
      .insert(songVetos)
      .values(data)
      .returning();
    return veto;
  }

  async removeSongVetoLegacy(songId: string, membershipId: string): Promise<boolean> {
    const result = await db
      .delete(songVetos)
      .where(and(
        eq(songVetos.songId, songId),
        eq(songVetos.membershipId, membershipId)
      ));
    return (result.rowCount ?? 0) > 0;
  }

  // NEW BAND-SCOPED METHODS

  // Band Management
  async createBand(insertBand: InsertBand, creatorUserId: string): Promise<Band> {
    try {
      const response = await fetch(`${BNDY_API_URL}/admin/bands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: insertBand.name,
          slug: insertBand.slug,
          description: insertBand.description,
          avatarUrl: insertBand.avatarUrl,
          allowedEventTypes: insertBand.allowedEventTypes,
          createdBy: creatorUserId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create band: ${error.error}`);
      }

      const auroraBand = await response.json();

      // Create membership for creator
      await this.addUserToBand(creatorUserId, auroraBand.id, {
        role: 'owner',
        displayName: insertBand.name + ' Owner',
        icon: 'fa-crown',
        color: '#FFD700',
      });

      // Convert Aurora response to expected format
      return {
        id: auroraBand.id,
        name: auroraBand.name,
        slug: auroraBand.slug,
        description: auroraBand.description,
        avatarUrl: auroraBand.avatarUrl,
        allowedEventTypes: auroraBand.allowedEventTypes,
        createdBy: auroraBand.createdBy,
        createdAt: new Date(auroraBand.createdAt),
        updatedAt: new Date(auroraBand.updatedAt),
      };
    } catch (error) {
      console.error('Failed to create band:', error);
      throw error;
    }
  }

  async getBand(bandId: string): Promise<Band | undefined> {
    try {
      const response = await fetch(`${BNDY_API_URL}/admin/bands/${bandId}`);
      if (response.status === 404) {
        return undefined;
      }
      if (!response.ok) {
        throw new Error(`Failed to get band: ${response.statusText}`);
      }
      const band = await response.json();
      return {
        id: band.id,
        name: band.name,
        slug: band.slug,
        description: band.description,
        avatarUrl: band.avatarUrl,
        allowedEventTypes: band.allowedEventTypes,
        createdBy: band.createdBy,
        createdAt: new Date(band.createdAt),
        updatedAt: new Date(band.updatedAt),
      };
    } catch (error) {
      console.error('Failed to get band:', error);
      return undefined;
    }
  }

  async updateBand(bandId: string, updates: Partial<InsertBand>): Promise<Band | undefined> {
    try {
      const response = await fetch(`${BNDY_API_URL}/admin/bands/${bandId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        return undefined;
      }
      const band = await response.json();
      return {
        id: band.id,
        name: band.name,
        slug: band.slug,
        description: band.description,
        avatarUrl: band.avatarUrl,
        allowedEventTypes: band.allowedEventTypes,
        createdBy: band.createdBy,
        createdAt: new Date(band.createdAt),
        updatedAt: new Date(band.updatedAt),
      };
    } catch (error) {
      console.error('Failed to update band:', error);
      return undefined;
    }
  }

  async deleteBand(bandId: string): Promise<boolean> {
    // Get all song IDs for this band first
    const bandSongs = await db.select({ id: songs.id }).from(songs).where(eq(songs.bandId, bandId));
    const songIds = bandSongs.map(song => song.id);
    
    // Delete all related data first
    if (songIds.length > 0) {
      // Delete song vetos and readiness for all songs in this band
      await Promise.all(songIds.map(songId => [
        db.delete(songVetos).where(eq(songVetos.songId, songId)),
        db.delete(songReadiness).where(eq(songReadiness.songId, songId))
      ]).flat());
    }
    
    // Delete songs, events, and user bands
    await db.delete(songs).where(eq(songs.bandId, bandId));
    await db.delete(events).where(eq(events.bandId, bandId));
    await db.delete(userBands).where(eq(userBands.bandId, bandId));
    
    const result = await db.delete(bands).where(eq(bands.id, bandId));
    return (result.rowCount ?? 0) > 0;
  }

  // Band Membership Management
  async addUserToBand(userId: string, bandId: string, membership: Omit<InsertUserBand, 'userId' | 'bandId'>): Promise<UserBand> {
    try {
      const response = await fetch(`${BNDY_API_URL}/admin/user-bands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          bandId,
          role: membership.role,
          displayName: membership.displayName,
          icon: membership.icon,
          color: membership.color,
          avatarUrl: membership.avatarUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to add user to band: ${error.error}`);
      }

      const auroraMembership = await response.json();

      return {
        id: auroraMembership.id,
        userId: auroraMembership.userId,
        bandId: auroraMembership.bandId,
        role: auroraMembership.role,
        displayName: auroraMembership.displayName,
        icon: auroraMembership.icon,
        color: auroraMembership.color,
        avatarUrl: auroraMembership.avatarUrl,
        joinedAt: new Date(auroraMembership.joinedAt),
      };
    } catch (error) {
      console.error('Failed to add user to band:', error);
      throw error;
    }
  }

  async removeUserFromBand(userId: string, bandId: string): Promise<boolean> {
    // Get user's membership to clean up related data
    const [membership] = await db
      .select()
      .from(userBands)
      .where(and(eq(userBands.userId, userId), eq(userBands.bandId, bandId)));

    if (membership) {
      // Clean up user's events, readiness, and vetos in this band
      await db.delete(songVetos).where(eq(songVetos.membershipId, membership.id));
      await db.delete(songReadiness).where(eq(songReadiness.membershipId, membership.id));
      await db.delete(events).where(eq(events.membershipId, membership.id));
    }

    const result = await db
      .delete(userBands)
      .where(and(eq(userBands.userId, userId), eq(userBands.bandId, bandId)));
    return (result.rowCount ?? 0) > 0;
  }

  async updateUserBandRole(userId: string, bandId: string, role: string): Promise<UserBand | undefined> {
    const [updatedMembership] = await db
      .update(userBands)
      .set({ role })
      .where(and(eq(userBands.userId, userId), eq(userBands.bandId, bandId)))
      .returning();
    
    return updatedMembership || undefined;
  }

  async updateMemberAvatar(membershipId: string, avatarUrl: string | null): Promise<UserBand | undefined> {
    const [updatedMembership] = await db
      .update(userBands)
      .set({ avatarUrl })
      .where(eq(userBands.id, membershipId))
      .returning();
    
    return updatedMembership || undefined;
  }

  async getBandMembers(bandId: string): Promise<(UserBand & { user: User })[]> {
    try {
      const response = await fetch(`${BNDY_API_URL}/admin/bands/${bandId}/members`);
      if (!response.ok) {
        console.error('Failed to get band members:', response.statusText);
        return [];
      }
      const auroraMembers = await response.json();

      return auroraMembers.map((am: any) => ({
        id: am.id,
        userId: am.userId,
        bandId: am.bandId,
        role: am.role,
        displayName: am.displayName,
        icon: am.icon,
        color: am.color,
        avatarUrl: am.avatarUrl,
        joinedAt: new Date(am.joinedAt),
        user: {
          id: am.userId,
          supabaseId: am.supabaseId || '',
          phone: am.phone,
          email: am.email,
          firstName: am.firstName,
          lastName: am.lastName,
          displayName: am.userDisplayName || am.displayName,
          hometown: am.hometown || '',
          instrument: am.instrument || '',
          avatarUrl: am.userAvatarUrl || am.avatarUrl,
          platformAdmin: false,
          profileCompleted: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      }));
    } catch (error) {
      console.error('Failed to get band members:', error);
      return [];
    }
  }

  // Band-Scoped Event Methods
  async getEvents(bandId: string): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.bandId, bandId));
  }

  async getEvent(bandId: string, eventId: string): Promise<Event | undefined> {
    const [event] = await db
      .select()
      .from(events)
      .where(and(eq(events.bandId, bandId), eq(events.id, eventId)));
    return event || undefined;
  }

  async getEventsByDateRange(bandId: string, startDate: string, endDate: string): Promise<Event[]> {
    const bandEvents = await db.select().from(events).where(eq(events.bandId, bandId));
    
    return bandEvents.filter(event => {
      const eventDate = event.date;
      const eventEndDate = event.endDate || event.date;
      return eventDate <= endDate && eventEndDate >= startDate;
    });
  }

  async getEventsByMembership(bandId: string, membershipId: string): Promise<Event[]> {
    return await db
      .select()
      .from(events)
      .where(and(eq(events.bandId, bandId), eq(events.membershipId, membershipId)));
  }

  async createEvent(bandId: string, eventData: Omit<InsertEvent, 'bandId'>): Promise<Event> {
    try {
      const response = await fetch(`${BNDY_API_URL}/admin/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bandId: bandId,
          ownerUserId: eventData.ownerUserId,
          type: eventData.type,
          title: eventData.title,
          date: eventData.date,
          endDate: eventData.endDate,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          location: eventData.location,
          venue: eventData.venue,
          notes: eventData.notes,
          isPublic: eventData.isPublic,
          membershipId: eventData.membershipId,
          isAllDay: eventData.isAllDay,
          createdByMembershipId: eventData.createdByMembershipId,
          latitude: eventData.latitude || null,
          longitude: eventData.longitude || null,
          venueId: eventData.venueId || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create event: ${error.error}`);
      }

      const auroraEvent = await response.json();

      return {
        id: auroraEvent.id,
        bandId: auroraEvent.bandId,
        ownerUserId: auroraEvent.ownerUserId,
        type: auroraEvent.type,
        title: auroraEvent.title,
        date: auroraEvent.date,
        endDate: auroraEvent.endDate,
        startTime: auroraEvent.startTime,
        endTime: auroraEvent.endTime,
        location: auroraEvent.location,
        venue: auroraEvent.venue,
        notes: auroraEvent.notes,
        isPublic: auroraEvent.isPublic,
        membershipId: auroraEvent.membershipId,
        memberId: null,
        isAllDay: auroraEvent.isAllDay,
        createdByMembershipId: auroraEvent.createdByMembershipId,
        createdAt: new Date(auroraEvent.createdAt),
      };
    } catch (error) {
      console.error('Failed to create event:', error);
      throw error;
    }
  }

  async updateEvent(bandId: string, eventId: string, eventData: Partial<Omit<InsertEvent, 'bandId'>>): Promise<Event | undefined> {
    const [updatedEvent] = await db
      .update(events)
      .set(eventData)
      .where(and(eq(events.bandId, bandId), eq(events.id, eventId)))
      .returning();
    
    return updatedEvent || undefined;
  }

  async deleteEvent(bandId: string, eventId: string): Promise<boolean> {
    const result = await db
      .delete(events)
      .where(and(eq(events.bandId, bandId), eq(events.id, eventId)));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteEventsByMembership(bandId: string, membershipId: string): Promise<void> {
    await db
      .delete(events)
      .where(and(eq(events.bandId, bandId), eq(events.membershipId, membershipId)));
  }

  async checkConflicts(bandId: string, data: { 
    date: string; 
    endDate?: string; 
    type: string; 
    membershipId?: string;
    excludeEventId?: string; 
  }): Promise<{ 
    bandEventConflicts: Event[];
    unavailabilityConflicts: Event[];
    affectedBandEvents: Event[];
  }> {
    const bandEvents = await db.select().from(events).where(eq(events.bandId, bandId));
    
    // Filter out the event being edited if provided
    const eventsToCheck = data.excludeEventId 
      ? bandEvents.filter(event => event.id !== data.excludeEventId)
      : bandEvents;
    
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

  // User Events (personal events like unavailable days)
  async getUserEvents(userId: string): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.ownerUserId, userId));
  }

  async getUserEventsByDateRange(userId: string, startDate: string, endDate: string): Promise<Event[]> {
    const userEvents = await db.select().from(events).where(eq(events.ownerUserId, userId));
    
    return userEvents.filter(event => {
      const eventDate = event.date;
      const eventEndDate = event.endDate || event.date;
      return eventDate <= endDate && eventEndDate >= startDate;
    });
  }

  async createUserEvent(userId: string, eventData: Omit<InsertEvent, 'ownerUserId'>): Promise<Event> {
    const [event] = await db
      .insert(events)
      .values({ ...eventData, ownerUserId: userId })
      .returning();
    return event;
  }

  async updateUserEvent(userId: string, eventId: string, eventData: Partial<Omit<InsertEvent, 'ownerUserId'>>): Promise<Event | undefined> {
    const [updatedEvent] = await db
      .update(events)
      .set(eventData)
      .where(and(eq(events.ownerUserId, userId), eq(events.id, eventId)))
      .returning();
    
    return updatedEvent || undefined;
  }

  async deleteUserEvent(userId: string, eventId: string): Promise<boolean> {
    const result = await db
      .delete(events)
      .where(and(eq(events.ownerUserId, userId), eq(events.id, eventId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Cross-band events (events from other bands user is a member of)
  async getOtherBandEvents(userId: string, excludeBandId: string): Promise<(Event & { bandName: string })[]> {
    const result = await db
      .select({
        id: events.id,
        bandId: events.bandId,
        ownerUserId: events.ownerUserId,
        type: events.type,
        title: events.title,
        date: events.date,
        endDate: events.endDate,
        startTime: events.startTime,
        endTime: events.endTime,
        location: events.location,
        venue: events.venue,
        notes: events.notes,
        isPublic: events.isPublic,
        membershipId: events.membershipId,
        memberId: events.memberId,
        isAllDay: events.isAllDay,
        createdByMembershipId: events.createdByMembershipId,
        createdAt: events.createdAt,
        bandName: bands.name,
      })
      .from(events)
      .innerJoin(bands, eq(events.bandId, bands.id))
      .innerJoin(userBands, and(
        eq(userBands.bandId, bands.id),
        eq(userBands.userId, userId)
      ))
      .where(and(
        isNotNull(events.bandId), // band events only (bandId is not null)
        ne(events.bandId, excludeBandId) // exclude current band
      ));
    
    return result;
  }

  async getOtherBandEventsByDateRange(userId: string, excludeBandId: string, startDate: string, endDate: string): Promise<(Event & { bandName: string })[]> {
    const allOtherBandEvents = await this.getOtherBandEvents(userId, excludeBandId);
    
    return allOtherBandEvents.filter(event => {
      const eventDate = event.date;
      const eventEndDate = event.endDate || event.date;
      return eventDate <= endDate && eventEndDate >= startDate;
    });
  }

  // Unified calendar (all events for a band's calendar view)
  async getUnifiedCalendar(bandId: string, startDate: string, endDate: string): Promise<{
    bandEvents: Event[];
    userEvents: Event[];
    otherBandEvents: (Event & { bandName: string })[];
  }> {
    // Get current band events in date range
    const bandEvents = await this.getEventsByDateRange(bandId, startDate, endDate);
    
    // Get all user IDs who are members of this band
    const bandMembers = await db
      .select({ userId: userBands.userId })
      .from(userBands)
      .where(eq(userBands.bandId, bandId));
    
    const memberUserIds = bandMembers.map(member => member.userId);
    
    // Get user events (personal unavailable days) from all band members
    const allUserEvents = await Promise.all(
      memberUserIds.map(userId => this.getUserEventsByDateRange(userId, startDate, endDate))
    );
    const userEvents = allUserEvents.flat();
    
    // Get events from other bands that these users are in
    const allOtherBandEvents = await Promise.all(
      memberUserIds.map(userId => this.getOtherBandEventsByDateRange(userId, bandId, startDate, endDate))
    );
    const otherBandEvents = allOtherBandEvents.flat();
    
    return {
      bandEvents,
      userEvents,
      otherBandEvents
    };
  }

  // Band-Scoped Song Methods
  async getSongs(bandId: string): Promise<Song[]> {
    return await db.select().from(songs).where(eq(songs.bandId, bandId)).orderBy(desc(songs.createdAt));
  }

  async getSong(bandId: string, songId: string): Promise<Song | undefined> {
    const [song] = await db
      .select()
      .from(songs)
      .where(and(eq(songs.bandId, bandId), eq(songs.id, songId)));
    return song || undefined;
  }

  async getSongBySpotifyId(bandId: string, spotifyId: string): Promise<Song | undefined> {
    const [song] = await db
      .select()
      .from(songs)
      .where(and(eq(songs.bandId, bandId), eq(songs.spotifyId, spotifyId)));
    return song || undefined;
  }

  async createSong(bandId: string, songData: Omit<InsertSong, 'bandId'>): Promise<Song> {
    const [song] = await db
      .insert(songs)
      .values({ ...songData, bandId })
      .returning();
    return song;
  }

  async deleteSong(bandId: string, songId: string): Promise<boolean> {
    // Verify song belongs to band and delete associated data
    const song = await this.getSong(bandId, songId);
    if (!song) {
      return false;
    }

    // Delete associated readiness and vetos first
    await db.delete(songReadiness).where(eq(songReadiness.songId, songId));
    await db.delete(songVetos).where(eq(songVetos.songId, songId));
    
    const result = await db.delete(songs).where(eq(songs.id, songId));
    return (result.rowCount ?? 0) > 0;
  }

  // Band-Scoped Song Readiness Methods
  async getSongReadiness(bandId: string, songId: string): Promise<SongReadiness[]> {
    // Verify song belongs to band first
    const song = await this.getSong(bandId, songId);
    if (!song) {
      return [];
    }
    
    return await db.select().from(songReadiness).where(eq(songReadiness.songId, songId));
  }

  async setSongReadiness(bandId: string, data: Omit<InsertSongReadiness, 'membershipId'> & { membershipId: string }): Promise<SongReadiness> {
    // Verify song belongs to band
    const song = await this.getSong(bandId, data.songId);
    if (!song) {
      throw new Error('Song not found in band');
    }

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
        .values(data as InsertSongReadiness)
        .returning();
      return created;
    }
  }

  async removeSongReadiness(bandId: string, songId: string, membershipId: string): Promise<boolean> {
    // Verify song belongs to band
    const song = await this.getSong(bandId, songId);
    if (!song) {
      return false;
    }
    
    const result = await db
      .delete(songReadiness)
      .where(and(
        eq(songReadiness.songId, songId),
        eq(songReadiness.membershipId, membershipId)
      ));
    return (result.rowCount ?? 0) > 0;
  }

  // Band-Scoped Song Veto Methods
  async getSongVetos(bandId: string, songId: string): Promise<SongVeto[]> {
    // Verify song belongs to band first
    const song = await this.getSong(bandId, songId);
    if (!song) {
      return [];
    }
    
    return await db.select().from(songVetos).where(eq(songVetos.songId, songId));
  }

  async addSongVeto(bandId: string, data: Omit<InsertSongVeto, 'membershipId'> & { membershipId: string }): Promise<SongVeto> {
    // Verify song belongs to band
    const song = await this.getSong(bandId, data.songId);
    if (!song) {
      throw new Error('Song not found in band');
    }

    const [veto] = await db
      .insert(songVetos)
      .values(data as InsertSongVeto)
      .returning();
    return veto;
  }

  async removeSongVeto(bandId: string, songId: string, membershipId: string): Promise<boolean> {
    // Verify song belongs to band
    const song = await this.getSong(bandId, songId);
    if (!song) {
      return false;
    }
    
    const result = await db
      .delete(songVetos)
      .where(and(
        eq(songVetos.songId, songId),
        eq(songVetos.membershipId, membershipId)
      ));
    return (result.rowCount ?? 0) > 0;
  }

  // Platform Admin Methods
  async getTotalBandsCount(): Promise<number> {
    const [{ count: totalBands }] = await db.select({ count: count() }).from(bands);
    return totalBands;
  }

  // Invite token validation methods
  async validateInviteToken(token: string): Promise<{ isValid: boolean; invitation?: any; error?: string }> {
    // TODO: Implement invite token validation
    // For now, return stub implementation
    return { isValid: false, error: "Invite token validation not yet implemented" };
  }

  async acceptInviteToken(token: string, userId: string, userDisplayName: string): Promise<{ success: boolean; bandId?: string; error?: string }> {
    // TODO: Implement invite token acceptance
    // For now, return stub implementation
    return { success: false, error: "Invite token acceptance not yet implemented" };
  }

}

export const storage = new ApiStorage();
