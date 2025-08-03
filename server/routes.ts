import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBandMemberSchema, insertEventSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Band Members endpoints
  app.get("/api/band-members", async (req, res) => {
    try {
      const members = await storage.getBandMembers();
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch band members" });
    }
  });

  app.get("/api/band-members/:id", async (req, res) => {
    try {
      const member = await storage.getBandMember(req.params.id);
      if (!member) {
        return res.status(404).json({ message: "Band member not found" });
      }
      res.json(member);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch band member" });
    }
  });

  app.post("/api/band-members", async (req, res) => {
    try {
      const validatedData = insertBandMemberSchema.parse(req.body);
      const member = await storage.createBandMember(validatedData);
      res.status(201).json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create band member" });
    }
  });

  app.delete("/api/band-members/:id", async (req, res) => {
    try {
      const success = await storage.deleteBandMember(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Band member not found" });
      }
      res.json({ message: "Band member deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete band member" });
    }
  });

  // Events endpoints
  app.get("/api/events", async (req, res) => {
    try {
      const { startDate, endDate, memberId } = req.query;
      
      let events;
      if (startDate && endDate) {
        events = await storage.getEventsByDateRange(
          startDate as string, 
          endDate as string
        );
      } else if (memberId) {
        events = await storage.getEventsByMember(memberId as string);
      } else {
        events = await storage.getEvents();
      }
      
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.post("/api/events", async (req, res) => {
    try {
      const validatedData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.patch("/api/events/:id", async (req, res) => {
    try {
      const validatedData = insertEventSchema.partial().parse(req.body);
      const event = await storage.updateEvent(req.params.id, validatedData);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", async (req, res) => {
    try {
      const success = await storage.deleteEvent(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Check for conflicts
  app.post("/api/events/check-conflicts", async (req, res) => {
    try {
      const { date, endDate, type } = req.body;
      const result = await storage.checkConflicts({ date, endDate, type });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to check conflicts" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
