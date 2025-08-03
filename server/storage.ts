import { type BandMember, type InsertBandMember, type Event, type InsertEvent } from "@shared/schema";
import { randomUUID } from "crypto";

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
}

export class MemStorage implements IStorage {
  private bandMembers: Map<string, BandMember>;
  private events: Map<string, Event>;

  constructor() {
    this.bandMembers = new Map();
    this.events = new Map();
    
    // Initialize with some default band members
    this.initializeDefaultMembers();
  }

  private initializeDefaultMembers() {
    const defaultMembers = [
      { name: "Alex", role: "Lead Vocals", icon: "fa-microphone", color: "#D2691E" },
      { name: "Jordan", role: "Lead Guitar", icon: "fa-guitar", color: "#6B8E23" },
      { name: "Sam", role: "Bass Guitar", icon: "fa-guitar", color: "#9932CC" },
      { name: "Casey", role: "Drums", icon: "fa-drum", color: "#DC143C" },
      { name: "Riley", role: "Keyboards", icon: "fa-piano", color: "#4169E1" },
    ];

    defaultMembers.forEach(member => {
      const id = randomUUID();
      const bandMember: BandMember = { ...member, id };
      this.bandMembers.set(id, bandMember);
    });
  }

  // Band Members
  async getBandMembers(): Promise<BandMember[]> {
    return Array.from(this.bandMembers.values());
  }

  async getBandMember(id: string): Promise<BandMember | undefined> {
    return this.bandMembers.get(id);
  }

  async createBandMember(insertMember: InsertBandMember): Promise<BandMember> {
    const id = randomUUID();
    const member: BandMember = { ...insertMember, id };
    this.bandMembers.set(id, member);
    return member;
  }

  async deleteBandMember(id: string): Promise<boolean> {
    // Delete all events associated with this member
    await this.deleteEventsByMember(id);
    return this.bandMembers.delete(id);
  }

  // Events
  async getEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async getEvent(id: string): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getEventsByDateRange(startDate: string, endDate: string): Promise<Event[]> {
    return Array.from(this.events.values()).filter(event => {
      const eventDate = event.date;
      const eventEndDate = event.endDate || event.date;
      return eventDate <= endDate && eventEndDate >= startDate;
    });
  }

  async getEventsByMember(memberId: string): Promise<Event[]> {
    return Array.from(this.events.values()).filter(event => event.memberId === memberId);
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = randomUUID();
    const event: Event = { 
      ...insertEvent, 
      id, 
      createdAt: new Date()
    };
    this.events.set(id, event);
    return event;
  }

  async updateEvent(id: string, updateData: Partial<InsertEvent>): Promise<Event | undefined> {
    const existingEvent = this.events.get(id);
    if (!existingEvent) return undefined;

    const updatedEvent: Event = { ...existingEvent, ...updateData };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteEvent(id: string): Promise<boolean> {
    return this.events.delete(id);
  }

  async deleteEventsByMember(memberId: string): Promise<void> {
    const memberEvents = await this.getEventsByMember(memberId);
    memberEvents.forEach(event => {
      this.events.delete(event.id);
    });
  }
}

export const storage = new MemStorage();
